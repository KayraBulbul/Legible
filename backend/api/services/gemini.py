import asyncio
import base64
import json
import logging
import re
from dataclasses import dataclass
from typing import Never, Protocol

from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from ai import gemini_service
from ai.errors import RateLimitedError, UpstreamServiceError
from api.schemas import (
    AiPreferences,
    ImageDescriptionKind,
    ImageDescriptionRole,
    SemanticDocument,
    TextTransformationOperation,
)

logger = logging.getLogger(__name__)
_PROVIDER_REASON = re.compile(r"\A[A-Z][A-Z0-9_]{0,79}\Z")


class GeminiError(Exception):
    """Base class for safe provider-boundary failures."""


class GeminiRateLimitError(GeminiError):
    """The provider rejected the request because its quota was exhausted."""


class GeminiProviderError(GeminiError):
    """The provider failed or returned an unusable response."""


class GeminiUnavailableError(GeminiError):
    """The service is not configured for provider calls."""


@dataclass(frozen=True)
class GeminiTransformation:
    document: SemanticDocument
    model: str
    prompt_version: str


@dataclass(frozen=True)
class GeminiImageDescription:
    alt_text: str
    role: ImageDescriptionRole | None
    model: str
    prompt_version: str


class GeminiService(Protocol):
    async def transform(
        self,
        operation: TextTransformationOperation,
        document: SemanticDocument,
        options: AiPreferences,
    ) -> GeminiTransformation: ...

    async def describe_image(
        self,
        kind: ImageDescriptionKind,
        image: bytes,
        mime_type: str,
        context_text: str | None,
    ) -> GeminiImageDescription: ...

    async def close(self) -> None: ...


class _ProviderMetadata(BaseModel):
    model_config = ConfigDict(extra="ignore")

    model: str = Field(min_length=1, max_length=120)
    prompt_version: str = Field(alias="promptVersion", min_length=1, max_length=120)


class _TransformationOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    html: str = Field(min_length=1, max_length=1_000_000)
    text: str = Field(min_length=1, max_length=1_000_000)
    language: str | None = Field(default=None, min_length=2, max_length=35)

    @field_validator("html", "text")
    @classmethod
    def reject_blank_content(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("provider content must not be blank")
        return value


class _TransformationResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    output: _TransformationOutput
    metadata: _ProviderMetadata


class _ImageDescriptionResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    alt_text: str = Field(alias="altText", min_length=1, max_length=2_000)
    role: ImageDescriptionRole | None = None
    metadata: _ProviderMetadata

    @field_validator("alt_text")
    @classmethod
    def reject_blank_alt_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("provider alt text must not be blank")
        return value


class GoogleGeminiService:
    """Async API adapter for the teammate-owned synchronous Gemini functions."""

    def __init__(
        self,
        api_key: str | None,
        model: str,
        request_timeout_seconds: float = 30.0,
    ) -> None:
        self._api_key = api_key
        self._model = model
        self._request_timeout_milliseconds = max(1, round(request_timeout_seconds * 1_000))
        self._client: genai.Client | None = None

    async def transform(
        self,
        operation: TextTransformationOperation,
        document: SemanticDocument,
        options: AiPreferences,
    ) -> GeminiTransformation:
        client = self._get_client()
        try:
            result = await asyncio.to_thread(
                gemini_service.transform_content,
                operation.value,
                document.model_dump(mode="json", by_alias=True),
                options.model_dump(mode="json", by_alias=True),
                client=client,
                model=self._model,
            )
            provider_result = _TransformationResult.model_validate(result)
            output = provider_result.output
            return GeminiTransformation(
                document=SemanticDocument(
                    html=output.html,
                    text=output.text,
                    language=output.language,
                ),
                model=provider_result.metadata.model,
                prompt_version=provider_result.metadata.prompt_version,
            )
        except RateLimitedError as exc:
            raise GeminiRateLimitError from exc
        except ValidationError as exc:
            _log_provider_failure("response_validation", exc, self._model)
            raise GeminiProviderError from exc
        except Exception as exc:
            _raise_provider_error(exc, self._model)

    async def describe_image(
        self,
        kind: ImageDescriptionKind,
        image: bytes,
        mime_type: str,
        context_text: str | None,
    ) -> GeminiImageDescription:
        client = self._get_client()
        data_url = f"data:{mime_type};base64,{base64.b64encode(image).decode('ascii')}"
        try:
            result = await asyncio.to_thread(
                gemini_service.describe_image,
                kind.value,
                data_url,
                context_text,
                client=client,
                model=self._model,
            )
            provider_result = _ImageDescriptionResult.model_validate(result)
            return GeminiImageDescription(
                alt_text=provider_result.alt_text,
                role=provider_result.role,
                model=provider_result.metadata.model,
                prompt_version=provider_result.metadata.prompt_version,
            )
        except RateLimitedError as exc:
            raise GeminiRateLimitError from exc
        except ValidationError as exc:
            _log_provider_failure("response_validation", exc, self._model)
            raise GeminiProviderError from exc
        except Exception as exc:
            _raise_provider_error(exc, self._model)

    async def close(self) -> None:
        if self._client is not None:
            await asyncio.to_thread(self._client.close)
            self._client = None

    def _get_client(self) -> genai.Client:
        if not self._api_key:
            raise GeminiUnavailableError
        if self._client is None:
            http_options = types.HttpOptions(timeout=self._request_timeout_milliseconds)
            self._client = genai.Client(api_key=self._api_key, http_options=http_options)
        return self._client


def _raise_provider_error(error: Exception, model: str) -> Never:
    stage = (
        "response_validation"
        if isinstance(error, UpstreamServiceError) and _find_provider_error(error) is None
        else "request"
    )
    _log_provider_failure(stage, error, model)
    raise GeminiProviderError from error


def _log_provider_failure(stage: str, error: Exception, model: str) -> None:
    provider_error = _find_provider_error(error)
    diagnostic_error = provider_error or error.__cause__ or error
    diagnostic = {
        "event": "gemini_provider_failure",
        "failure_stage": stage,
        "exception_type": type(diagnostic_error).__name__,
        "provider_code": provider_error.code if provider_error is not None else None,
        "provider_status": provider_error.status if provider_error is not None else None,
        "provider_reason": _provider_reason(provider_error),
        "model": model,
    }
    logger.error(
        json.dumps(diagnostic, separators=(",", ":"), sort_keys=True),
        extra=diagnostic,
    )


def _find_provider_error(error: Exception) -> genai_errors.APIError | None:
    current: BaseException | None = error
    while current is not None:
        if isinstance(current, genai_errors.APIError):
            return current
        current = current.__cause__
    return None


def _provider_reason(error: genai_errors.APIError | None) -> str | None:
    if error is None or not isinstance(error.details, dict):
        return None
    provider_error = error.details.get("error", error.details)
    if not isinstance(provider_error, dict):
        return None
    details = provider_error.get("details")
    if not isinstance(details, list):
        return None
    for detail in details:
        if not isinstance(detail, dict):
            continue
        reason = detail.get("reason")
        if isinstance(reason, str) and _PROVIDER_REASON.fullmatch(reason):
            return reason
    return None
