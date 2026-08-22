import asyncio
from collections.abc import AsyncIterator, Iterator
from copy import deepcopy
from typing import Any, cast

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import get_pdf_export_service
from api.main import app
from api.services import pdf_exports
from api.services.pdf_exports import PdfExportService
from database.session import get_database_session, session_factory
from pdf.renderers import PdfRendererError, PdfRendererTimeout, PdfRenderInput
from tests.helpers import create_guest_headers


class FakeRenderer:
    def __init__(self, error: Exception | None = None) -> None:
        self.calls: list[PdfRenderInput] = []
        self.error = error

    async def render(self, render_input: PdfRenderInput) -> bytes:
        self.calls.append(render_input)
        if self.error is not None:
            raise self.error
        return b"%PDF-1.7\nfake export"


class BlockingRenderer:
    def __init__(self) -> None:
        self.started = asyncio.Event()
        self.release = asyncio.Event()

    async def render(self, _render_input: PdfRenderInput) -> bytes:
        self.started.set()
        await self.release.wait()
        return b"%PDF-1.7\nfake export"


class TransactionCheckingRenderer:
    def __init__(self, sessions: list[AsyncSession]) -> None:
        self.sessions = sessions

    async def render(self, _render_input: PdfRenderInput) -> bytes:
        assert len(self.sessions) == 1
        assert not self.sessions[0].in_transaction()
        return b"%PDF-1.7\nfake export"


@pytest.fixture
def fake_renderer() -> Iterator[FakeRenderer]:
    renderer = FakeRenderer()
    app.dependency_overrides[get_pdf_export_service] = lambda: PdfExportService(renderer, 2)
    yield renderer
    app.dependency_overrides.pop(get_pdf_export_service, None)


async def create_page(
    client: AsyncClient,
    payload: dict[str, Any],
    headers: dict[str, str],
) -> dict[str, Any]:
    response = await client.post("/api/v1/saved-pages", json=payload, headers=headers)
    assert response.status_code == 201
    return cast(dict[str, Any], response.json())


async def test_pdf_export_requires_authentication(
    client: AsyncClient, fake_renderer: FakeRenderer
) -> None:
    response = await client.get(
        "/api/v1/saved-pages/62f44fe6-e6d2-44cc-9b38-e2d49bd15ace/export.pdf"
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "authentication_required"
    assert fake_renderer.calls == []


async def test_pdf_export_hides_another_users_page(
    client: AsyncClient,
    saved_page_payload: dict[str, Any],
    fake_renderer: FakeRenderer,
) -> None:
    owner_headers = await create_guest_headers(client)
    other_headers = await create_guest_headers(client)
    created = await create_page(client, saved_page_payload, owner_headers)

    response = await client.get(
        f"/api/v1/saved-pages/{created['id']}/export.pdf", headers=other_headers
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "saved_page_not_found"
    assert fake_renderer.calls == []


@pytest.mark.parametrize(
    ("query", "expected_content", "expected_text"),
    [
        ("", "transformed", "Simplified content."),
        ("?content=preferred", "transformed", "Simplified content."),
        ("?content=source", "source", "Original content."),
        ("?content=transformed", "transformed", "Simplified content."),
    ],
)
async def test_pdf_export_selects_requested_content(
    client: AsyncClient,
    saved_page_payload: dict[str, Any],
    fake_renderer: FakeRenderer,
    query: str,
    expected_content: str,
    expected_text: str,
) -> None:
    headers = await create_guest_headers(client)
    payload = deepcopy(saved_page_payload)
    payload["transformedDocument"] = {
        "format": "semantic_html",
        "html": "<article><h1>Simple</h1><p>Simplified content.</p></article>",
        "text": "Simple\n\nSimplified content.",
        "language": "en-AU",
    }
    created = await create_page(client, payload, headers)

    response = await client.get(
        f"/api/v1/saved-pages/{created['id']}/export.pdf{query}", headers=headers
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["x-exported-content"] == expected_content
    assert response.content.startswith(b"%PDF")
    assert fake_renderer.calls[-1].document.text.endswith(expected_text)


async def test_preferred_falls_back_to_source_without_transformed_content(
    client: AsyncClient,
    saved_page_payload: dict[str, Any],
    fake_renderer: FakeRenderer,
) -> None:
    headers = await create_guest_headers(client)
    created = await create_page(client, saved_page_payload, headers)

    response = await client.get(f"/api/v1/saved-pages/{created['id']}/export.pdf", headers=headers)

    assert response.status_code == 200
    assert response.headers["x-exported-content"] == "source"
    assert fake_renderer.calls[-1].document.text.endswith("Original content.")


async def test_transformed_export_reports_unavailable_content(
    client: AsyncClient,
    saved_page_payload: dict[str, Any],
    fake_renderer: FakeRenderer,
) -> None:
    headers = await create_guest_headers(client)
    created = await create_page(client, saved_page_payload, headers)

    response = await client.get(
        f"/api/v1/saved-pages/{created['id']}/export.pdf?content=transformed",
        headers=headers,
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "transformed_content_unavailable"
    assert fake_renderer.calls == []


async def test_pdf_export_rejects_unknown_content_mode(
    client: AsyncClient,
    saved_page_payload: dict[str, Any],
    fake_renderer: FakeRenderer,
) -> None:
    headers = await create_guest_headers(client)
    created = await create_page(client, saved_page_payload, headers)

    response = await client.get(
        f"/api/v1/saved-pages/{created['id']}/export.pdf?content=other", headers=headers
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert fake_renderer.calls == []


async def test_pdf_export_uses_safe_utf8_filename_and_does_not_write_to_database(
    client: AsyncClient,
    saved_page_payload: dict[str, Any],
    fake_renderer: FakeRenderer,
) -> None:
    headers = await create_guest_headers(client)
    payload = deepcopy(saved_page_payload)
    payload["title"] = ' Résumé / Q3 "notes"\r\nInjected '
    created = await create_page(client, payload, headers)
    before = await client.get(f"/api/v1/saved-pages/{created['id']}", headers=headers)

    response = await client.get(f"/api/v1/saved-pages/{created['id']}/export.pdf", headers=headers)
    after = await client.get(f"/api/v1/saved-pages/{created['id']}", headers=headers)

    assert response.status_code == 200
    disposition = response.headers["content-disposition"]
    assert "\r" not in disposition and "\n" not in disposition
    assert 'filename="Resume-Q3-notes-Injected.pdf"' in disposition
    assert "filename*=UTF-8''R%C3%A9sum%C3%A9%20Q3%20%22notes%22Injected.pdf" in disposition
    assert before.json() == after.json()


async def test_pdf_export_releases_database_before_rendering(
    client: AsyncClient,
    saved_page_payload: dict[str, Any],
) -> None:
    headers = await create_guest_headers(client)
    created = await create_page(client, saved_page_payload, headers)
    sessions: list[AsyncSession] = []

    async def tracked_database_session() -> AsyncIterator[AsyncSession]:
        async with session_factory() as database:
            sessions.append(database)
            yield database

    renderer = TransactionCheckingRenderer(sessions)
    app.dependency_overrides[get_database_session] = tracked_database_session
    app.dependency_overrides[get_pdf_export_service] = lambda: PdfExportService(renderer, 1)
    try:
        response = await client.get(
            f"/api/v1/saved-pages/{created['id']}/export.pdf", headers=headers
        )
    finally:
        app.dependency_overrides.pop(get_database_session, None)
        app.dependency_overrides.pop(get_pdf_export_service, None)

    assert response.status_code == 200


@pytest.mark.parametrize(
    ("renderer_error", "status", "code"),
    [
        (PdfRendererError("broken"), 502, "pdf_export_failed"),
        (PdfRendererTimeout("slow"), 503, "pdf_export_timeout"),
    ],
)
async def test_pdf_renderer_errors_use_stable_envelopes(
    client: AsyncClient,
    saved_page_payload: dict[str, Any],
    renderer_error: Exception,
    status: int,
    code: str,
) -> None:
    headers = await create_guest_headers(client)
    created = await create_page(client, saved_page_payload, headers)
    renderer = FakeRenderer(renderer_error)
    app.dependency_overrides[get_pdf_export_service] = lambda: PdfExportService(renderer, 1)
    try:
        response = await client.get(
            f"/api/v1/saved-pages/{created['id']}/export.pdf", headers=headers
        )
    finally:
        app.dependency_overrides.pop(get_pdf_export_service, None)

    assert response.status_code == status
    assert response.json()["error"]["code"] == code


async def test_pdf_export_reports_saturation(
    client: AsyncClient,
    saved_page_payload: dict[str, Any],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    headers = await create_guest_headers(client)
    created = await create_page(client, saved_page_payload, headers)
    renderer = BlockingRenderer()
    service = PdfExportService(renderer, 1)
    app.dependency_overrides[get_pdf_export_service] = lambda: service
    monkeypatch.setattr(pdf_exports, "CAPACITY_WAIT_SECONDS", 0.01)

    first_request = asyncio.create_task(
        client.get(f"/api/v1/saved-pages/{created['id']}/export.pdf", headers=headers)
    )
    await renderer.started.wait()
    try:
        busy_response = await client.get(
            f"/api/v1/saved-pages/{created['id']}/export.pdf", headers=headers
        )
    finally:
        renderer.release.set()
        first_response = await first_request
        app.dependency_overrides.pop(get_pdf_export_service, None)

    assert first_response.status_code == 200
    assert busy_response.status_code == 503
    assert busy_response.json()["error"]["code"] == "pdf_export_busy"
