"""Manual, local-only smoke test for gemini_service.py.

Run this yourself with YOUR OWN key. Never paste a real API key into chat.

Setup (from the repo root):
    pip install -r backend/ai/requirements.txt
    cp backend/ai/.env.example backend/ai/.env
    # then open backend/ai/.env and paste your real key in there

Run with the built-in fake examples:
    python -m backend.ai.manual_test

Run against real content instead:
    python -m backend.ai.manual_test --text path/to/article.txt
    python -m backend.ai.manual_test --html path/to/article.html
    python -m backend.ai.manual_test --image path/to/photo.jpg
    python -m backend.ai.manual_test --html article.html --image photo.jpg

--text is plain text, gets wrapped in a bare <article> tag (fine for a quick test).
--html is real HTML you copied (e.g. from a page's "View Page Source") — closer to what
production actually sends, since the real input format is semantic HTML, not plain text.
If both are passed, --html wins. --image can be any .png/.jpg/.jpeg/.webp/.svg file.
"""
import argparse
import base64
import mimetypes
import os
import re

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from google import genai  # noqa: E402  (must come after load_dotenv)

from .gemini_service import GEMINI_MODEL, describe_image, transform_content  # noqa: E402

# A 1x1 red pixel PNG, used only when no --image is passed in.
TINY_PNG_DATA_URL = (
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk"
    "+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


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


def test_transform(text_path: str = None, html_path: str = None):
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

    result = transform_content(
        operation="simplify",
        input_document=input_document,
        options={"simplificationLevel": "moderate"},
    )
    print("transform_content() ->", result)


def test_describe_image(image_path: str = None):
    data_url = file_to_data_url(image_path) if image_path else TINY_PNG_DATA_URL
    result = describe_image(kind="img", data_url=data_url)
    print("describe_image() ->", result)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", help="Path to a plain-text file to simplify")
    parser.add_argument("--html", help="Path to a real HTML file to simplify (wins over --text)")
    parser.add_argument("--image", help="Path to an image file to describe")
    args = parser.parse_args()

    print(f"Using model: {GEMINI_MODEL}\n")
    list_available_flash_models()
    print()
    test_transform(args.text, args.html)
    print()
    test_describe_image(args.image)
