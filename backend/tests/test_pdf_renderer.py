import json
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from threading import Thread
from typing import Any, cast

import pytest
from pypdf import PdfReader
from pypdf.generic import DictionaryObject

from api.schemas import AccessibilitySettings, DyslexiaFont, SemanticDocument
from pdf.renderers import PdfRenderInput, WeasyPrintRenderer
from pdf.worker import build_html, document_direction, settings_css


class RecordingHandler(BaseHTTPRequestHandler):
    request_count = 0

    def do_GET(self) -> None:
        type(self).request_count += 1
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"not an image")

    def log_message(self, _format: str, *args: object) -> None:
        return


def test_print_settings_generate_bounded_css() -> None:
    css = settings_css(
        {
            "dyslexiaFont": "opendyslexic",
            "fontScale": 150,
            "lineHeight": 2,
            "letterSpacing": 0.15,
            "wordSpacing": 0.3,
            "readingWidth": 60,
            "contrastMode": "dark",
            "ttsRate": 2,
        }
    )

    assert "'Export OpenDyslexic', 'Noto Sans', sans-serif" in css
    assert "font-size: 16.500pt" in css
    assert "line-height: 2.000" in css
    assert "letter-spacing: 0.150em" in css
    assert "word-spacing: 0.300em" in css
    assert "max-width: 60.000ch" in css
    assert "contrastMode" not in css
    assert "ttsRate" not in css


@pytest.mark.parametrize(
    ("language", "expected"),
    [
        (None, "ltr"),
        ("en-AU", "ltr"),
        ("ar", "rtl"),
        ("he-IL", "rtl"),
        ("az-Arab", "rtl"),
        ("ar-Latn", "ltr"),
    ],
)
def test_document_direction_uses_language_and_script(language: str | None, expected: str) -> None:
    assert document_direction(language) == expected


def test_export_wrapper_sets_rtl_base_direction() -> None:
    wrapper, _allowed_urls = build_html(
        {
            "title": "اختبار التصدير",
            "original_url": "https://example.com/article",
            "captured_at": "2026-08-22T14:30:00+10:00",
            "document": {
                "html": "<article><p>هذه فقرة عربية.</p></article>",
                "text": "هذه فقرة عربية.",
                "language": "ar",
            },
            "settings": {},
        }
    )

    assert '<html lang="ar" dir="rtl">' in wrapper


def test_railpack_installs_core_and_cjk_noto_fonts() -> None:
    configuration = json.loads((Path(__file__).parents[1] / "railpack.json").read_text())
    packages = configuration["deploy"]["aptPackages"]

    assert "fonts-noto-core" in packages
    assert "fonts-noto-cjk" in packages


async def test_real_renderer_produces_tagged_pdf_with_metadata_and_navigation() -> None:
    RecordingHandler.request_count = 0
    server = ThreadingHTTPServer(("127.0.0.1", 0), RecordingHandler)
    server_thread = Thread(target=server.serve_forever)
    server_thread.start()
    image_url = f"http://127.0.0.1:{server.server_port}/must-not-load.png"
    repeated_paragraphs = "".join(
        f"<p>Reading-order paragraph {number}: text remains legible across pages.</p>"
        for number in range(1, 46)
    )
    render_input = PdfRenderInput(
        title="Accessible export QA",
        original_url="https://example.com/source",
        captured_at=datetime.fromisoformat("2026-08-22T14:30:00+10:00"),
        document=SemanticDocument(
            html=(
                "<article><h1>Document heading</h1><h2>Details</h2>"
                "<p>Selectable Unicode text: Καλημέρα 世界.</p>"
                "<ul><li>First list item</li><li>Second list item</li></ul>"
                "<table><caption>Accessibility checks</caption>"
                "<thead><tr><th>Check</th><th>Result</th></tr></thead>"
                "<tbody><tr><td>Long content wraps</td><td>Pass</td></tr></tbody></table>"
                "<pre><code>const longIdentifier = "
                "'abcdefghijklmnopqrstuvwxyz0123456789';</code></pre>"
                '<p><a href="https://example.org/details">Working link</a></p>'
                f'<img src="{image_url}" alt="A useful diagram">'
                f"{repeated_paragraphs}"
                "</article>"
            ),
            text="Document heading\nDetails\nSelectable Unicode text: Καλημέρα 世界.",
            language="en-AU",
        ),
        settings=AccessibilitySettings(dyslexia_font=DyslexiaFont.LEXEND, font_scale=115),
    )

    try:
        pdf = await WeasyPrintRenderer(timeout_seconds=20).render(render_input)
    finally:
        server.shutdown()
        server.server_close()
        server_thread.join()
    reader = PdfReader(BytesIO(pdf))
    root = cast(DictionaryObject, reader.trailer["/Root"])
    mark_info = cast(DictionaryObject, root["/MarkInfo"])
    extracted_text = "\n".join(page.extract_text() or "" for page in reader.pages)

    assert pdf.startswith(b"%PDF")
    assert len(reader.pages) >= 2
    assert RecordingHandler.request_count == 0
    assert reader.metadata is not None
    assert reader.metadata.title == "Accessible export QA"
    assert str(root["/Lang"]) == "en-AU"
    assert "/StructTreeRoot" in root
    assert bool(mark_info["/Marked"])
    assert "Selectable Unicode text:" in extracted_text
    assert "Καλημέρα 世界" in extracted_text
    assert "[Image: A useful diagram]" in extracted_text
    assert reader.outline

    links = _external_links(reader)
    assert "https://example.com/source" in links
    assert "https://example.org/details" in links

    metadata = root["/Metadata"].get_object()
    metadata_stream = cast(Any, metadata).get_data()
    assert b"pdfuaid:part" in metadata_stream
    assert b'pdfuaid:part="1"' in metadata_stream


def _external_links(reader: PdfReader) -> set[str]:
    links: set[str] = set()
    for page in reader.pages:
        for annotation_reference in page.get("/Annots", []):
            annotation: dict[str, Any] = annotation_reference.get_object()
            action = annotation.get("/A")
            if annotation.get("/Subtype") == "/Link" and action is not None:
                uri = action.get("/URI")
                if uri is not None:
                    links.add(str(uri))
    return links
