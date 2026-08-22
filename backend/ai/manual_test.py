"""Manual, local-only smoke test for gemini_service.py.

Run this yourself with YOUR OWN key. Never paste a real API key into chat.

Setup (from the repo root):
    pip install -r backend/ai/requirements.txt
    cp backend/ai/.env.example backend/ai/.env
    # then open backend/ai/.env and paste your real key in there

Run with the built-in fake examples (prints to console only, no file written):
    python -m backend.ai.manual_test

Run against real content instead (writes a readable HTML report to test/output/):
    python -m backend.ai.manual_test --text path/to/article.txt
    python -m backend.ai.manual_test --html path/to/article.html
    python -m backend.ai.manual_test --image path/to/photo.jpg
    python -m backend.ai.manual_test --html article.html --image photo.jpg

--text is plain text, gets wrapped in a bare <article> tag (fine for a quick test).
--html is real HTML you copied (e.g. from a page's "View Page Source") — closer to what
production actually sends, since the real input format is semantic HTML, not plain text.
If both are passed, --html wins. --image can be any .png/.jpg/.jpeg/.webp/.svg file.

Test a different transform operation (default is simplify):
    python -m backend.ai.manual_test --html article.html --operation summarize
    python -m backend.ai.manual_test --html article.html --operation restructure
    python -m backend.ai.manual_test --html article.html --operation focus

--simplification-level only affects the simplify operation, default "moderate"
(other valid values per docs/api.md: "light", "strong"):
    python -m backend.ai.manual_test --html article.html --simplification-level strong

Each operation writes to its own file, e.g. test/output/transform_result_summarize.html,
so running several operations back to back doesn't overwrite earlier results.
"""
import argparse
import base64
import html as html_escape
import json
import mimetypes
import os
import re

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from google import genai  # noqa: E402  (must come after load_dotenv)

from .gemini_service import GEMINI_MODEL, describe_image, transform_content  # noqa: E402
from .prompts import TRANSFORM_PROMPTS  # noqa: E402

# A 1x1 red pixel PNG, used only when no --image is passed in.
TINY_PNG_DATA_URL = (
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk"
    "+A8AAQUBAScY42YAAAAASUVORK5CYII="
)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "test", "output")

REPORT_STYLE = """
body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 720px;
  margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #1a1a1a; }
h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: #888;
  margin-top: 32px; margin-bottom: 8px; }
.meta { background: #f5f5f5; padding: 12px 16px; border-radius: 8px; font-size: 14px; }
.meta div { margin: 3px 0; }
.meta b { color: #555; }
.box { border: 1px solid #ddd; border-radius: 8px; padding: 16px 20px; }
img.test-image { max-width: 100%; border-radius: 8px; border: 1px solid #ddd; }
"""


def list_available_flash_models():
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    print("Models containing 'flash' available to this key:")
    for model in client.models.list():
        if "flash" in model.name.lower():
            print(" -", model.name)


def file_to_data_url(path: str) -> str:
    mime_type, _ = mimetypes.guess_type(path)
    if not mime_type:
        raise ValueError(f"Could not guess a MIME type for {path}")
    with open(path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def write_transform_report(result: dict, operation: str) -> str:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, f"transform_result_{operation}.html")
    output = result["output"]
    metadata = result["metadata"]
    page = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>transform_content() result</title>
<style>{REPORT_STYLE}</style></head><body>
<h2>Metadata</h2>
<div class="meta">
<div><b>Operation:</b> {html_escape.escape(metadata['operation'])}</div>
<div><b>Model:</b> {html_escape.escape(metadata['model'])}</div>
<div><b>Prompt version:</b> {html_escape.escape(metadata['promptVersion'])}</div>
<div><b>Parameters:</b> {html_escape.escape(json.dumps(metadata['parameters']))}</div>
<div><b>Performed at:</b> {html_escape.escape(metadata['performedAt'])}</div>
</div>
<h2>Rendered output (output.html, shown as real HTML)</h2>
<div class="box">{output['html']}</div>
<h2>Plain text fallback (output.text)</h2>
<div class="box">{html_escape.escape(output['text'])}</div>
</body></html>"""
    with open(path, "w", encoding="utf-8") as f:
        f.write(page)
    return path


def write_describe_image_report(result: dict, data_url: str) -> str:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, "describe_image_result.html")
    metadata = result["metadata"]
    page = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>describe_image() result</title>
<style>{REPORT_STYLE}</style></head><body>
<h2>Image tested</h2>
<img class="test-image" src="{data_url}" alt="test image">
<h2>Generated result</h2>
<div class="meta">
<div><b>altText:</b> {html_escape.escape(result['altText'])}</div>
<div><b>role:</b> {html_escape.escape(str(result['role']))}</div>
<div><b>cached:</b> {result['cached']}</div>
<div><b>Model:</b> {html_escape.escape(metadata['model'])}</div>
<div><b>Prompt version:</b> {html_escape.escape(metadata['promptVersion'])}</div>
<div><b>Performed at:</b> {html_escape.escape(metadata['performedAt'])}</div>
</div>
</body></html>"""
    with open(path, "w", encoding="utf-8") as f:
        f.write(page)
    return path


def test_transform(
    text_path: str = None,
    html_path: str = None,
    operation: str = "simplify",
    simplification_level: str = "moderate",
):
    if operation not in TRANSFORM_PROMPTS:
        raise ValueError(f"Unknown operation {operation!r}, must be one of {list(TRANSFORM_PROMPTS)}")

    is_real_input = bool(text_path or html_path)

    if html_path:
        with open(html_path, "r", encoding="utf-8") as f:
            html = f.read()
        # Rough tag-strip, just for the "text" fallback field — not production-grade,
        # good enough for a manual test.
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"\s+", " ", text).strip()
        input_document = {
            "format": "semantic_html",
            "html": html,
            "text": text,
            "language": "en",
        }
    elif text_path:
        with open(text_path, "r", encoding="utf-8") as f:
            text = f.read()
        input_document = {
            "format": "semantic_html",
            "html": f"<article>{text}</article>",
            "text": text,
            "language": "en",
        }
    else:
        input_document = {
            "format": "semantic_html",
            "html": "<article><p>Complex content.</p></article>",
            "text": "Complex content.",
            "language": "en",
        }

    options = {"simplificationLevel": simplification_level} if operation == "simplify" else {}
    result = transform_content(
        operation=operation,
        input_document=input_document,
        options=options,
    )

    if is_real_input:
        path = write_transform_report(result, operation)
        print(f"transform_content() [{operation}] -> saved readable report to {path}")
    else:
        print(f"transform_content() [{operation}] ->", result)


def test_describe_image(image_path: str = None):
    data_url = file_to_data_url(image_path) if image_path else TINY_PNG_DATA_URL
    result = describe_image(kind="img", data_url=data_url)

    if image_path:
        path = write_describe_image_report(result, data_url)
        print(f"describe_image() -> saved readable report to {path}")
    else:
        print("describe_image() ->", result)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", help="Path to a plain-text file to simplify")
    parser.add_argument("--html", help="Path to a real HTML file to simplify (wins over --text)")
    parser.add_argument("--image", help="Path to an image file to describe")
    parser.add_argument(
        "--operation",
        choices=list(TRANSFORM_PROMPTS),
        default="simplify",
        help="Which transform_content() operation to test (default: simplify)",
    )
    parser.add_argument(
        "--simplification-level",
        default="moderate",
        help='Only used when --operation simplify (default: "moderate")',
    )
    args = parser.parse_args()

    print(f"Using model: {GEMINI_MODEL}\n")
    list_available_flash_models()
    print()
    test_transform(args.text, args.html, args.operation, args.simplification_level)
    print()
    test_describe_image(args.image)
