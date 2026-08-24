import asyncio
import base64
import binascii
import re
from collections.abc import Callable, Coroutine
from datetime import UTC, datetime, timedelta
from typing import Any, TypeVar
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from api.errors import AppError
from api.rate_limits import RateLimitRule, consume_rate_limits, rate_limit_key
from api.schemas import (
    AiProviderMetadata,
    ImageDescriptionKind,
    ImageDescriptionRequest,
    ImageDescriptionResponse,
    TransformationOperation,
    TransformationRecord,
    TransformationRequest,
    TransformationResponse,
)
from api.services.content import sanitize_document
from api.services.gemini import (
    GeminiProviderError,
    GeminiRateLimitError,
    GeminiService,
    GeminiTimeoutError,
    GeminiUnavailableError,
)

MAX_IMAGE_BYTES = 8 * 1024 * 1024
ALLOWED_IMAGE_MIME_TYPES = frozenset({"image/png", "image/jpeg", "image/webp"})
_DATA_URL = re.compile(r"\Adata:([^;,]+);base64,([A-Za-z0-9+/=]+)\Z")
ProviderResult = TypeVar("ProviderResult")


class AiApplicationService:
    def __init__(
        self,
        provider: GeminiService,
        *,
        timeout_seconds: float,
        concurrency: int,
        capacity_wait_seconds: float,
        requests_per_minute: int,
        requests_per_ip_per_minute: int,
        global_requests_per_minute: int,
    ) -> None:
        self._provider = provider
        self._timeout_seconds = timeout_seconds
        self._capacity_wait_seconds = capacity_wait_seconds
        self._capacity = asyncio.Semaphore(concurrency)
        self._provider_tasks: set[asyncio.Task[Any]] = set()
        self._requests_per_minute = requests_per_minute
        self._requests_per_ip_per_minute = requests_per_ip_per_minute
        self._global_requests_per_minute = global_requests_per_minute

    async def transform(
        self,
        database: AsyncSession,
        user_id: UUID,
        client_key: str,
        payload: TransformationRequest,
    ) -> TransformationResponse:
        document = sanitize_document(payload.input)
        await database.rollback()
        await self._consume_rate_limit(database, user_id, client_key)
        result = await self._run_provider_call(
            lambda: self._provider.transform(payload.operation, document, payload.options)
        )

        output = sanitize_document(result.document)
        performed_at = datetime.now(UTC)
        return TransformationResponse(
            output=output,
            metadata=TransformationRecord(
                operation=TransformationOperation(payload.operation.value),
                provider="google",
                model=result.model,
                prompt_version=result.prompt_version,
                parameters=payload.options.model_dump(mode="json", by_alias=True),
                performed_at=performed_at,
            ),
        )

    async def describe_image(
        self,
        database: AsyncSession,
        user_id: UUID,
        client_key: str,
        payload: ImageDescriptionRequest,
    ) -> ImageDescriptionResponse:
        mime_type, image = decode_image_data_url(payload.data_url)
        await database.rollback()
        await self._consume_rate_limit(database, user_id, client_key)
        result = await self._run_provider_call(
            lambda: self._provider.describe_image(
                payload.kind,
                image,
                mime_type,
                payload.context_text,
            )
        )

        return ImageDescriptionResponse(
            alt_text=result.alt_text,
            role=None if payload.kind is ImageDescriptionKind.ICON_BUTTON else result.role,
            cached=False,
            metadata=AiProviderMetadata(
                provider="google",
                model=result.model,
                prompt_version=result.prompt_version,
                performed_at=datetime.now(UTC),
            ),
        )

    async def close(self) -> None:
        if self._provider_tasks:
            await asyncio.gather(*self._provider_tasks, return_exceptions=True)
        await self._provider.close()

    async def _run_provider_call(
        self,
        call: Callable[[], Coroutine[Any, Any, ProviderResult]],
    ) -> ProviderResult:
        await self._acquire_capacity()
        task = asyncio.create_task(call())
        self._provider_tasks.add(task)
        task.add_done_callback(self._provider_call_finished)
        try:
            return await asyncio.wait_for(
                asyncio.shield(task),
                timeout=self._timeout_seconds,
            )
        except (TimeoutError, GeminiTimeoutError) as exc:
            raise AppError(503, "ai_timeout", "The AI request timed out.") from exc
        except GeminiRateLimitError as exc:
            raise AppError(
                429,
                "ai_rate_limited",
                "The AI service rate limit was reached. Try again later.",
            ) from exc
        except GeminiUnavailableError as exc:
            raise AppError(
                503,
                "ai_unavailable",
                "The AI service is temporarily unavailable.",
            ) from exc
        except GeminiProviderError as exc:
            raise AppError(502, "ai_provider_failed", "The AI service failed.") from exc

    def _provider_call_finished(self, task: asyncio.Task[Any]) -> None:
        self._provider_tasks.discard(task)
        self._capacity.release()
        if not task.cancelled():
            task.exception()

    async def _consume_rate_limit(
        self,
        database: AsyncSession,
        user_id: UUID,
        client_key: str,
    ) -> None:
        window = timedelta(minutes=1)
        await consume_rate_limits(
            database,
            (
                RateLimitRule(
                    rate_limit_key("ai-user", str(user_id)),
                    self._requests_per_minute,
                    window,
                ),
                RateLimitRule(
                    rate_limit_key("ai-client", client_key),
                    self._requests_per_ip_per_minute,
                    window,
                ),
                RateLimitRule(
                    rate_limit_key("ai-global", "all"),
                    self._global_requests_per_minute,
                    window,
                ),
            ),
            error_code="ai_rate_limited",
            error_message="Too many AI requests. Try again later.",
        )

    async def _acquire_capacity(self) -> None:
        try:
            await asyncio.wait_for(
                self._capacity.acquire(),
                timeout=self._capacity_wait_seconds,
            )
        except TimeoutError as exc:
            raise AppError(
                503,
                "ai_busy",
                "AI request capacity is temporarily full. Try again shortly.",
            ) from exc


def decode_image_data_url(data_url: str) -> tuple[str, bytes]:
    match = _DATA_URL.fullmatch(data_url)
    if match is None:
        raise AppError(
            415,
            "unsupported_image_type",
            "dataUrl must be a base64 PNG, JPEG, or WebP image.",
        )
    mime_type, encoded = match.groups()
    if mime_type not in ALLOWED_IMAGE_MIME_TYPES:
        raise AppError(
            415,
            "unsupported_image_type",
            "Only PNG, JPEG, and WebP images are supported.",
        )
    try:
        image = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise AppError(
            415,
            "unsupported_image_type",
            "dataUrl contains invalid base64 image data.",
        ) from exc
    if not image:
        raise AppError(415, "unsupported_image_type", "The image must not be empty.")
    if len(image) > MAX_IMAGE_BYTES:
        raise AppError(
            413,
            "image_too_large",
            "The decoded image exceeds the 8 MiB limit.",
        )
    if not _matches_image_signature(mime_type, image):
        raise AppError(
            415,
            "unsupported_image_type",
            "The decoded data does not match its declared image type.",
        )
    return mime_type, image


def _matches_image_signature(mime_type: str, image: bytes) -> bool:
    if mime_type == "image/png":
        return image.startswith(b"\x89PNG\r\n\x1a\n")
    if mime_type == "image/jpeg":
        return image.startswith(b"\xff\xd8\xff")
    return len(image) >= 12 and image.startswith(b"RIFF") and image[8:12] == b"WEBP"
