import base64
import html
import json
import re
import sys
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Literal, cast
from urllib.parse import urlsplit

from weasyprint import HTML  # type: ignore[import-untyped]

FONT_DIRECTORY = Path(__file__).with_name("fonts")
RTL_LANGUAGES = frozenset(
    {"ar", "ckb", "dv", "fa", "he", "nqo", "ps", "sd", "syr", "ug", "ur", "yi"}
)
RTL_SCRIPTS = frozenset({"adlm", "arab", "hebr", "nkoo", "rohg", "syrc", "thaa"})


class ImagePlaceholderParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "img":
            self._append_image_placeholder(attrs)
            return
        self.parts.append(self.get_starttag_text() or f"<{tag}>")

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "img":
            self._append_image_placeholder(attrs)
            return
        self.parts.append(self.get_starttag_text() or f"<{tag} />")

    def handle_endtag(self, tag: str) -> None:
        if tag != "img":
            self.parts.append(f"</{tag}>")

    def handle_data(self, data: str) -> None:
        self.parts.append(data)

    def handle_entityref(self, name: str) -> None:
        self.parts.append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        self.parts.append(f"&#{name};")

    def handle_comment(self, _data: str) -> None:
        return

    def _append_image_placeholder(self, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        alt = (attributes.get("alt") or "").strip()
        label = f"Image: {alt}" if alt else "Image omitted"
        escaped = html.escape(label)
        self.parts.append(
            f'<span class="image-placeholder" role="img" aria-label="{escaped}">[{escaped}]</span>'
        )


def replace_images(fragment: str) -> str:
    parser = ImagePlaceholderParser()
    parser.feed(fragment)
    parser.close()
    return "".join(parser.parts)


def clamp(value: object, minimum: float, maximum: float, default: float) -> float:
    if not isinstance(value, int | float):
        return default
    return min(max(float(value), minimum), maximum)


def document_direction(language: object) -> Literal["ltr", "rtl"]:
    if not isinstance(language, str):
        return "ltr"
    subtags = [subtag.lower() for subtag in language.replace("_", "-").split("-") if subtag]
    if not subtags:
        return "ltr"
    if "latn" in subtags:
        return "ltr"
    if RTL_SCRIPTS.intersection(subtags) or subtags[0] in RTL_LANGUAGES:
        return "rtl"
    return "ltr"


def font_data_url(relative_path: str, mime_type: str) -> str:
    data = (FONT_DIRECTORY / relative_path).read_bytes()
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def font_css() -> tuple[str, frozenset[str]]:
    lexend_regular = font_data_url("lexend/Lexend-Regular.woff2", "font/woff2")
    lexend_bold = font_data_url("lexend/Lexend-Bold.ttf", "font/ttf")
    dyslexic_regular = font_data_url("opendyslexic/OpenDyslexic-Regular.otf", "font/otf")
    dyslexic_bold = font_data_url("opendyslexic/OpenDyslexic-Bold.otf", "font/otf")
    css = f"""
        @font-face {{
          font-family: 'Export Lexend';
          src: url('{lexend_regular}') format('woff2');
          font-weight: 400;
        }}
        @font-face {{
          font-family: 'Export Lexend';
          src: url('{lexend_bold}') format('truetype');
          font-weight: 700;
        }}
        @font-face {{
          font-family: 'Export OpenDyslexic';
          src: url('{dyslexic_regular}') format('opentype');
          font-weight: 400;
        }}
        @font-face {{
          font-family: 'Export OpenDyslexic';
          src: url('{dyslexic_bold}') format('opentype');
          font-weight: 700;
        }}
    """
    return css, frozenset({lexend_regular, lexend_bold, dyslexic_regular, dyslexic_bold})


def settings_css(settings: dict[str, Any]) -> str:
    requested_font = str(settings.get("dyslexiaFont") or "")
    font_family = {
        "lexend": "'Export Lexend', 'Noto Sans', sans-serif",
        "opendyslexic": "'Export OpenDyslexic', 'Noto Sans', sans-serif",
    }.get(requested_font, "'Noto Sans', sans-serif")
    font_scale = clamp(settings.get("fontScale"), 50, 300, 100) / 100
    line_height = clamp(settings.get("lineHeight"), 1, 4, 1.5)
    letter_spacing = clamp(settings.get("letterSpacing"), -0.1, 1, 0)
    word_spacing = clamp(settings.get("wordSpacing"), -0.1, 2, 0)
    reading_width = clamp(settings.get("readingWidth"), 30, 120, 72)
    return f"""
        body {{
          font-family: {font_family};
          font-size: {11 * font_scale:.3f}pt;
          line-height: {line_height:.3f};
          letter-spacing: {letter_spacing:.3f}em;
          word-spacing: {word_spacing:.3f}em;
        }}
        .document {{ max-width: {reading_width:.3f}ch; }}
    """


def document_css(settings: dict[str, Any]) -> tuple[str, frozenset[str]]:
    fonts, allowed_urls = font_css()
    return (
        fonts
        + settings_css(settings)
        + """
        @page {
          size: A4;
          margin: 18mm 17mm 20mm;
          @bottom-center {
            content: "Page " counter(page) " of " counter(pages);
            color: #555;
            font-family: 'Noto Sans', sans-serif;
            font-size: 8pt;
          }
        }
        * { box-sizing: border-box; }
        html { color: #111; background: #fff; }
        body { margin: 0; color: #111; background: #fff; }
        .document { margin: 0 auto; }
        .export-header {
          border-bottom: 1px solid #aaa;
          margin-bottom: 1.6em;
          padding-bottom: 1em;
        }
        .export-header h1 { margin: 0 0 .5em; font-size: 1.8em; }
        .export-metadata { margin: 0; font-size: .82em; color: #444; }
        .export-metadata div { display: flex; gap: .5em; margin-top: .25em; }
        .export-metadata dt { flex: 0 0 5.5em; font-weight: 700; }
        .export-metadata dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
        h1, h2, h3, h4, h5, h6 {
          break-after: avoid;
          color: #111;
          line-height: 1.25;
          margin: 1.35em 0 .55em;
        }
        h1 { font-size: 1.65em; }
        h2 { font-size: 1.4em; }
        h3 { font-size: 1.2em; }
        p, li, dd, blockquote { orphans: 3; widows: 3; }
        a { color: #0645ad; text-decoration: underline; overflow-wrap: anywhere; }
        ul, ol { padding-left: 1.7em; }
        blockquote {
          border-left: 3px solid #999;
          margin-left: 0;
          padding-left: 1em;
        }
        table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          overflow-wrap: anywhere;
        }
        thead { display: table-header-group; }
        tr { break-inside: avoid; }
        th, td { border: 1px solid #888; padding: .45em; vertical-align: top; }
        th { background: #eee; font-weight: 700; }
        pre, code { font-family: 'Noto Sans Mono', monospace; }
        pre {
          background: #f3f3f3;
          border: 1px solid #ccc;
          padding: .8em;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        .image-placeholder {
          border: 1px solid #888;
          color: #333;
          display: block;
          font-style: italic;
          margin: .8em 0;
          padding: .8em;
        }
        img, embed, object, iframe { display: none !important; }
        """
    ), allowed_urls


def build_html(payload: dict[str, Any]) -> tuple[str, frozenset[str]]:
    title = html.escape(str(payload["title"]))
    original_url = str(payload["original_url"])
    escaped_url = html.escape(original_url, quote=True)
    captured = datetime.fromisoformat(str(payload["captured_at"]))
    captured_display = captured.strftime("%Y-%m-%d %H:%M %Z").strip()
    document = payload["document"]
    language = html.escape(str(document.get("language") or "en"), quote=True)
    direction = document_direction(document.get("language"))
    fragment = replace_images(str(document["html"]))
    css, allowed_urls = document_css(payload["settings"])
    captured_iso = html.escape(captured.isoformat())
    captured_text = html.escape(captured_display)
    wrapper = f"""<!doctype html>
<html lang="{language}" dir="{direction}">
<head>
  <meta charset="utf-8">
  <meta name="generator" content="MelbHack Accessibility API">
  <title>{title}</title>
  <style>{css}</style>
</head>
<body>
  <main class="document">
    <header class="export-header">
      <h1>{title}</h1>
      <dl class="export-metadata">
        <div><dt>Source</dt><dd><a href="{escaped_url}">{escaped_url}</a></dd></div>
        <div><dt>Captured</dt><dd><time datetime="{captured_iso}">{captured_text}</time></dd></div>
      </dl>
    </header>
    <article>{fragment}</article>
  </main>
</body>
</html>"""
    return wrapper, allowed_urls


def render(payload: dict[str, Any]) -> bytes:
    wrapper, allowed_urls = build_html(payload)

    def trusted_url_fetcher(url: str) -> dict[str, Any]:
        if url in allowed_urls and urlsplit(url).scheme == "data":
            header, encoded = url.split(",", 1)
            mime_type = header[5:].split(";", 1)[0]
            return {"string": base64.b64decode(encoded), "mime_type": mime_type}
        raise ValueError("External resource loading is disabled for PDF exports")

    return cast(
        bytes,
        HTML(string=wrapper, url_fetcher=trusted_url_fetcher).write_pdf(
            pdf_variant="pdf/ua-1",
            pdf_tags=True,
        ),
    )


def main() -> None:
    try:
        payload = json.load(sys.stdin.buffer)
        pdf = render(payload)
    except Exception as exc:
        message = re.sub(r"\s+", " ", str(exc)).strip()
        print(f"PDF render failed: {type(exc).__name__}: {message}", file=sys.stderr)
        raise SystemExit(1) from None
    sys.stdout.buffer.write(pdf)


if __name__ == "__main__":
    main()
