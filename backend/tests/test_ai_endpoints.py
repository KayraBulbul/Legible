import asyncio
import base64
from collections.abc import Iterator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from ai.errors import GeminiProviderError, GeminiRateLimitError, GeminiUnavailableError
from ai.gemini_service import (
    GeminiImageDescription,
    GeminiTransformation,
    GoogleGeminiService,
)
from api.config import get_settings
from api.dependencies import get_ai_service
from api.main import app, create_app
from api.schemas import (
    AiPreferences,
    ImageDescriptionKind,
    ImageDescriptionRole,
    SemanticDocument,
    TextTransformationOperation,
)
from api.services.ai import MAX_IMAGE_BYTES, AiApplicationService
from database.session import engine
from tests.helpers import create_guest_headers

TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


class FakeGeminiService:
    def __init__(self) -> None:
        self.transform_error: Exception | None = None
        self.image_error: Exception | None = None
        self.delay = 0.0
        self.transform_calls: list[tuple[TextTransformationOperation, SemanticDocument]] = []
        self.image_calls: list[tuple[ImageDescriptionKind, bytes, str, str | None]] = []

    async def transform(
        self,
        operation: TextTransformationOperation,
        document: SemanticDocument,
        _options: AiPreferences,
    ) -> GeminiTransformation:
        self.transform_calls.append((operation, document))
        if self.delay:
            await asyncio.sleep(self.delay)
        if self.transform_error is not None:
            raise self.transform_error
        return GeminiTransformation(
            document=SemanticDocument(
                html='<article onclick="bad()"><h1>Clear</h1><script>bad()</script></article>',
                text="Clear",
                language=document.language,
            ),
            model="fake-gemini",
            prompt_version=f"{operation.value}-test-v1",
        )

    async def describe_image(
        self,
        kind: ImageDescriptionKind,
        image: bytes,
        mime_type: str,
        context_text: str | None,
    ) -> GeminiImageDescription:
        self.image_calls.append((kind, image, mime_type, context_text))
        if self.delay:
            await asyncio.sleep(self.delay)
        if self.image_error is not None:
            raise self.image_error
        return GeminiImageDescription(
            alt_text="A red dot.",
            role=ImageDescriptionRole.IMAGE,
            model="fake-gemini",
            prompt_version="image-test-v1",
        )

    async def close(self) -> None:
        return None


def make_service(
    provider: FakeGeminiService,
    *,
    timeout: float = 1,
    concurrency: int = 2,
    capacity_wait: float = 0.1,
    rate_limit: int = 15,
    ip_rate_limit: int = 15,
    global_rate_limit: int = 100,
) -> AiApplicationService:
    return AiApplicationService(
        provider,
        timeout_seconds=timeout,
        concurrency=concurrency,
        capacity_wait_seconds=capacity_wait,
        requests_per_minute=rate_limit,
        requests_per_ip_per_minute=ip_rate_limit,
        global_requests_per_minute=global_rate_limit,
    )


@pytest.fixture
def fake_provider() -> FakeGeminiService:
    return FakeGeminiService()


async def test_gemini_transform_preserves_unknown_language(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = GoogleGeminiService(api_key="test-key", model="fake-gemini")

    async def generate(_contents: object, response_schema: Any) -> Any:
        return response_schema(html="<p>Clear</p>", text="Clear", language=None)

    monkeypatch.setattr(provider, "_generate", generate)
    result = await provider.transform(
        TextTransformationOperation.SIMPLIFY,
        SemanticDocument(html="<p>Dense</p>", text="Dense", language=None),
        AiPreferences(),
    )

    assert result.document.language is None


@pytest.fixture
def ai_service(fake_provider: FakeGeminiService) -> Iterator[AiApplicationService]:
    service = make_service(fake_provider)
    app.dependency_overrides[get_ai_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_ai_service, None)


@pytest.mark.parametrize("path", ["/api/v1/transformations", "/api/v1/image-descriptions"])
async def test_ai_endpoints_require_authentication(client: AsyncClient, path: str) -> None:
    response = await client.post(path, json={})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "authentication_required"


async def test_transform_returns_sanitized_document_and_metadata(
    client: AsyncClient,
    ai_service: AiApplicationService,
    fake_provider: FakeGeminiService,
) -> None:
    headers = await create_guest_headers(client)
    response = await client.post(
        "/api/v1/transformations",
        headers=headers,
        json={
            "operation": "simplify",
            "input": {
                "format": "semantic_html",
                "html": '<article onclick="bad()"><p>Dense</p><script>bad()</script></article>',
                "text": "Dense",
                "language": "en",
            },
            "options": {
                "simplificationLevel": "strong",
                "preserveTechnicalTerms": False,
            },
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["output"] == {
        "format": "semantic_html",
        "html": "<article><h1>Clear</h1></article>",
        "text": "Clear",
        "language": "en",
    }
    assert body["metadata"]["operation"] == "simplify"
    assert body["metadata"]["provider"] == "google"
    assert body["metadata"]["model"] == "fake-gemini"
    assert body["metadata"]["parameters"] == {
        "simplificationLevel": "strong",
        "preserveTechnicalTerms": False,
    }
    assert body["metadata"]["performedAt"].endswith(("Z", "+00:00"))
    assert fake_provider.transform_calls[0][1].html == "<article><p>Dense</p></article>"


async def test_transform_does_not_write_to_postgresql(
    client: AsyncClient,
    ai_service: AiApplicationService,
) -> None:
    headers = await create_guest_headers(client)
    async with engine.connect() as connection:
        before = tuple(
            (
                await connection.execute(
                    text(
                        "SELECT (SELECT count(*) FROM users), "
                        "(SELECT count(*) FROM user_sessions), "
                        "(SELECT count(*) FROM saved_pages)"
                    )
                )
            ).one()
        )

    response = await client.post(
        "/api/v1/transformations",
        headers=headers,
        json={
            "operation": "focus",
            "input": {"html": "<p>Text</p>", "text": "Text", "language": "en"},
        },
    )

    async with engine.connect() as connection:
        after = tuple(
            (
                await connection.execute(
                    text(
                        "SELECT (SELECT count(*) FROM users), "
                        "(SELECT count(*) FROM user_sessions), "
                        "(SELECT count(*) FROM saved_pages)"
                    )
                )
            ).one()
        )
    assert response.status_code == 200
    assert after == before


async def test_image_description_decodes_image_for_provider(
    client: AsyncClient,
    ai_service: AiApplicationService,
    fake_provider: FakeGeminiService,
) -> None:
    headers = await create_guest_headers(client)
    response = await client.post(
        "/api/v1/image-descriptions",
        headers=headers,
        json={
            "kind": "img",
            "dataUrl": f"data:image/png;base64,{base64.b64encode(TINY_PNG).decode()}",
            "contextText": "A status indicator",
        },
    )

    assert response.status_code == 200
    assert response.json()["altText"] == "A red dot."
    assert response.json()["cached"] is False
    assert fake_provider.image_calls == [
        (ImageDescriptionKind.IMAGE, TINY_PNG, "image/png", "A status indicator")
    ]


async def test_icon_button_description_never_adds_an_image_role(
    client: AsyncClient,
    ai_service: AiApplicationService,
) -> None:
    headers = await create_guest_headers(client)
    response = await client.post(
        "/api/v1/image-descriptions",
        headers=headers,
        json={
            "kind": "icon-button",
            "dataUrl": f"data:image/png;base64,{base64.b64encode(TINY_PNG).decode()}",
        },
    )

    assert response.status_code == 200
    assert response.json()["role"] is None


@pytest.mark.parametrize(
    ("data_url", "expected_code"),
    [
        ("https://example.com/image.png", "unsupported_image_type"),
        ("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=", "unsupported_image_type"),
        ("data:image/png;base64,not-base64", "unsupported_image_type"),
        ("data:image/png;base64,YWJj", "unsupported_image_type"),
    ],
)
async def test_image_description_rejects_unsafe_or_malformed_images(
    client: AsyncClient,
    ai_service: AiApplicationService,
    fake_provider: FakeGeminiService,
    data_url: str,
    expected_code: str,
) -> None:
    headers = await create_guest_headers(client)
    response = await client.post(
        "/api/v1/image-descriptions",
        headers=headers,
        json={"kind": "img", "dataUrl": data_url},
    )

    assert response.status_code == 415
    assert response.json()["error"]["code"] == expected_code
    assert fake_provider.image_calls == []


async def test_image_description_rejects_decoded_image_over_eight_mib(
    fake_provider: FakeGeminiService,
) -> None:
    settings = get_settings()
    original_limit = settings.max_request_bytes
    settings.max_request_bytes = 20 * 1024 * 1024
    try:
        large_app = create_app()
    finally:
        settings.max_request_bytes = original_limit
    service = make_service(fake_provider)
    large_app.dependency_overrides[get_ai_service] = lambda: service
    transport = ASGITransport(app=large_app)
    async with AsyncClient(transport=transport, base_url="http://test") as large_client:
        headers = await create_guest_headers(large_client)
        image = b"\x89PNG\r\n\x1a\n" + bytes(MAX_IMAGE_BYTES - 7)
        response = await large_client.post(
            "/api/v1/image-descriptions",
            headers=headers,
            json={
                "kind": "img",
                "dataUrl": f"data:image/png;base64,{base64.b64encode(image).decode()}",
            },
        )

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "image_too_large"
    assert fake_provider.image_calls == []


@pytest.mark.parametrize(
    ("error", "status", "code"),
    [
        (GeminiRateLimitError(), 429, "ai_rate_limited"),
        (GeminiProviderError(), 502, "ai_provider_failed"),
        (GeminiUnavailableError(), 503, "ai_unavailable"),
    ],
)
async def test_transform_maps_safe_provider_errors(
    client: AsyncClient,
    fake_provider: FakeGeminiService,
    error: Exception,
    status: int,
    code: str,
) -> None:
    fake_provider.transform_error = error
    service = make_service(fake_provider)
    app.dependency_overrides[get_ai_service] = lambda: service
    try:
        headers = await create_guest_headers(client)
        response = await client.post(
            "/api/v1/transformations",
            headers=headers,
            json={
                "operation": "focus",
                "input": {"html": "<p>Text</p>", "text": "Text", "language": "en"},
            },
        )
    finally:
        app.dependency_overrides.pop(get_ai_service, None)

    assert response.status_code == status
    assert response.json()["error"]["code"] == code
    assert "secret" not in response.text


async def test_transform_times_out(
    client: AsyncClient,
    fake_provider: FakeGeminiService,
) -> None:
    fake_provider.delay = 0.1
    service = make_service(fake_provider, timeout=0.01)
    app.dependency_overrides[get_ai_service] = lambda: service
    try:
        headers = await create_guest_headers(client)
        response = await client.post(
            "/api/v1/transformations",
            headers=headers,
            json={
                "operation": "summarize",
                "input": {"html": "<p>Text</p>", "text": "Text", "language": "en"},
            },
        )
    finally:
        app.dependency_overrides.pop(get_ai_service, None)

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "ai_timeout"


async def test_transform_rejects_when_local_capacity_is_full(
    client: AsyncClient,
    fake_provider: FakeGeminiService,
) -> None:
    fake_provider.delay = 0.1
    service = make_service(fake_provider, concurrency=1, capacity_wait=0.01)
    app.dependency_overrides[get_ai_service] = lambda: service
    payload = {
        "operation": "focus",
        "input": {"html": "<p>Text</p>", "text": "Text", "language": "en"},
    }
    try:
        headers = await create_guest_headers(client)
        active = asyncio.create_task(
            client.post("/api/v1/transformations", headers=headers, json=payload)
        )
        await asyncio.sleep(0.01)
        busy = await client.post("/api/v1/transformations", headers=headers, json=payload)
        completed = await active
    finally:
        app.dependency_overrides.pop(get_ai_service, None)

    assert completed.status_code == 200
    assert busy.status_code == 503
    assert busy.json()["error"]["code"] == "ai_busy"


async def test_local_rate_limit_is_scoped_to_user(
    client: AsyncClient,
    fake_provider: FakeGeminiService,
) -> None:
    service = make_service(fake_provider, rate_limit=1)
    app.dependency_overrides[get_ai_service] = lambda: service
    payload = {
        "operation": "focus",
        "input": {"html": "<p>Text</p>", "text": "Text", "language": "en"},
    }
    try:
        first_user = await create_guest_headers(client)
        second_user = await create_guest_headers(client)
        assert (
            await client.post("/api/v1/transformations", headers=first_user, json=payload)
        ).status_code == 200
        limited = await client.post("/api/v1/transformations", headers=first_user, json=payload)
        other_user = await client.post("/api/v1/transformations", headers=second_user, json=payload)
    finally:
        app.dependency_overrides.pop(get_ai_service, None)

    assert limited.status_code == 429
    assert limited.json()["error"]["code"] == "ai_rate_limited"
    assert other_user.status_code == 200


async def test_new_guest_identity_does_not_reset_client_rate_limit(
    client: AsyncClient,
    fake_provider: FakeGeminiService,
) -> None:
    service = make_service(fake_provider, ip_rate_limit=1)
    app.dependency_overrides[get_ai_service] = lambda: service
    payload = {
        "operation": "focus",
        "input": {"html": "<p>Text</p>", "text": "Text", "language": "en"},
    }
    try:
        first_user = await create_guest_headers(client)
        second_user = await create_guest_headers(client)
        first = await client.post("/api/v1/transformations", headers=first_user, json=payload)
        limited = await client.post("/api/v1/transformations", headers=second_user, json=payload)
    finally:
        app.dependency_overrides.pop(get_ai_service, None)

    assert first.status_code == 200
    assert limited.status_code == 429
    assert limited.json()["error"]["code"] == "ai_rate_limited"


async def test_expired_rate_limit_subjects_are_removed(
    client: AsyncClient,
    fake_provider: FakeGeminiService,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service = make_service(fake_provider)
    app.dependency_overrides[get_ai_service] = lambda: service
    timestamps = iter((0.0, 61.0))
    monkeypatch.setattr("api.services.ai.monotonic", lambda: next(timestamps))
    payload = {
        "operation": "focus",
        "input": {"html": "<p>Text</p>", "text": "Text", "language": "en"},
    }
    try:
        first_user = await create_guest_headers(client)
        second_user = await create_guest_headers(client)
        first = await client.post("/api/v1/transformations", headers=first_user, json=payload)
        second = await client.post("/api/v1/transformations", headers=second_user, json=payload)
    finally:
        app.dependency_overrides.pop(get_ai_service, None)

    assert first.status_code == 200
    assert second.status_code == 200
    assert len(service._attempts) == 3


async def test_global_rate_limit_applies_across_clients(
    client: AsyncClient,
    fake_provider: FakeGeminiService,
) -> None:
    service = make_service(fake_provider, global_rate_limit=1)
    app.dependency_overrides[get_ai_service] = lambda: service
    payload = {
        "operation": "focus",
        "input": {"html": "<p>Text</p>", "text": "Text", "language": "en"},
    }
    other_transport = ASGITransport(app=app, client=("203.0.113.20", 4312))
    try:
        first_user = await create_guest_headers(client)
        async with AsyncClient(
            transport=other_transport,
            base_url="http://test",
        ) as other_client:
            second_user = await create_guest_headers(other_client)
            first = await client.post("/api/v1/transformations", headers=first_user, json=payload)
            limited = await other_client.post(
                "/api/v1/transformations", headers=second_user, json=payload
            )
    finally:
        app.dependency_overrides.pop(get_ai_service, None)

    assert first.status_code == 200
    assert limited.status_code == 429
    assert limited.json()["error"]["code"] == "ai_rate_limited"
