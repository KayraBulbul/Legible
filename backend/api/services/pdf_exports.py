import asyncio
import re
import unicodedata
from dataclasses import dataclass
from typing import Any, Literal
from urllib.parse import quote
from uuid import UUID

from pydantic import TypeAdapter
from sqlalchemy.ext.asyncio import AsyncSession

from api.errors import AppError
from api.schemas import AccessibilitySettings, PdfContentMode, SemanticDocument
from api.services.saved_pages import get_saved_page
from database.models import SavedPage
from pdf.renderers import PdfRenderer, PdfRendererError, PdfRendererTimeout, PdfRenderInput

CAPACITY_WAIT_SECONDS = 2


@dataclass(frozen=True)
class PdfExport:
    content: bytes
    content_disposition: str
    exported_content: str


class PdfExportService:
    def __init__(self, renderer: PdfRenderer, concurrency: int) -> None:
        self._renderer = renderer
        self._capacity = asyncio.Semaphore(concurrency)

    async def export(
        self,
        database: AsyncSession,
        user_id: UUID,
        page_id: UUID,
        content_mode: PdfContentMode,
    ) -> PdfExport:
        page = await get_saved_page(database, user_id, page_id)
        document_data, selected_content = _select_document(page, content_mode)
        document = TypeAdapter(SemanticDocument).validate_python(document_data)
        settings = TypeAdapter(AccessibilitySettings).validate_python(page.accessibility_settings)
        render_input = PdfRenderInput(
            title=page.title,
            original_url=page.original_url,
            captured_at=page.captured_at,
            document=document,
            settings=settings,
        )
        download_disposition = content_disposition(page.title)
        await database.rollback()

        try:
            await asyncio.wait_for(self._capacity.acquire(), timeout=CAPACITY_WAIT_SECONDS)
        except TimeoutError as exc:
            raise AppError(
                503,
                "pdf_export_busy",
                "PDF export capacity is temporarily full. Try again shortly.",
            ) from exc

        try:
            pdf = await self._renderer.render(render_input)
        except PdfRendererTimeout as exc:
            raise AppError(503, "pdf_export_timeout", "PDF export timed out.") from exc
        except PdfRendererError as exc:
            raise AppError(502, "pdf_export_failed", "PDF export failed.") from exc
        finally:
            self._capacity.release()

        return PdfExport(
            content=pdf,
            content_disposition=download_disposition,
            exported_content=selected_content,
        )


def _select_document(
    page: SavedPage, content_mode: PdfContentMode
) -> tuple[dict[str, Any], Literal["source", "transformed"]]:
    source = page.source_document
    transformed = page.transformed_document
    if content_mode is PdfContentMode.SOURCE:
        return source, "source"
    if transformed is not None:
        return transformed, "transformed"
    if content_mode is PdfContentMode.TRANSFORMED:
        raise AppError(
            409,
            "transformed_content_unavailable",
            "This saved page has no transformed content.",
        )
    return source, "source"


def content_disposition(title: str) -> str:
    clean_title = "".join(
        character
        for character in unicodedata.normalize("NFKC", title)
        if unicodedata.category(character) != "Cc" and character not in "/\\"
    )
    clean_title = re.sub(r"\s+", " ", clean_title).strip(" .") or "saved-page"
    clean_title = clean_title[:120].rstrip(" .")
    unicode_filename = f"{clean_title}.pdf"

    ascii_title = (
        unicodedata.normalize("NFKD", clean_title).encode("ascii", errors="ignore").decode("ascii")
    )
    ascii_title = re.sub(r"[^A-Za-z0-9._-]+", "-", ascii_title).strip("-.")
    ascii_filename = f"{ascii_title or 'saved-page'}.pdf"
    encoded_filename = quote(unicode_filename, safe="")
    return f"attachment; filename=\"{ascii_filename}\"; filename*=UTF-8''{encoded_filename}"
