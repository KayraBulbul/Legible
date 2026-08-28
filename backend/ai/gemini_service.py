"""Gemini-backed implementations of the two AI endpoints in docs/api.md:
POST /api/v1/transformations and POST /api/v1/image-descriptions.

meant to be imported and called from the actual route handlers.
"""

import base64
import binascii
import json
import os
import re
from datetime import UTC, datetime
from html.parser import HTMLParser
from typing import Any

from google import genai
from google.genai import errors as genai_errors
from google.genai import types as genai_types

from .errors import (
    PayloadTooLargeError,
    RateLimitedError,
    UnsupportedMediaTypeError,
    UpstreamServiceError,
)
from .prompts import IMAGE_PROMPTS, TRANSFORM_PROMPTS

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")
MAX_IMAGE_BYTES = 8 * 1024 * 1024  # 8 MB (gemini max 20mb i reckon per request)
ALLOWED_IMAGE_MIME_TYPES = {"image/png", "image/jpeg", "image/webp", "image/svg+xml"}

_DATA_URL_RE = re.compile(r"^data:([^;]+);base64,(.*)$", re.DOTALL)

_TRANSFORMATION_RESPONSE_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "html": {"type": "string"},
        "language": {"type": ["string", "null"]},
    },
    "required": ["html", "language"],
}

_BLOCK_TAGS = {
    "address",
    "article",
    "aside",
    "blockquote",
    "br",
    "caption",
    "dd",
    "div",
    "dl",
    "dt",
    "figcaption",
    "figure",
    "footer",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "header",
    "hr",
    "li",
    "main",
    "nav",
    "ol",
    "p",
    "pre",
    "section",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "ul",
}


class _PlainTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, _attrs: list[tuple[str, str | None]]) -> None:
        if tag in _BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in _BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def _html_to_text(fragment: str) -> str:
    parser = _PlainTextParser()
    parser.feed(fragment)
    parser.close()
    lines = (
        re.sub(r"[ \t\f\v]+", " ", line).strip() for line in "".join(parser.parts).splitlines()
    )
    return "\n".join(line for line in lines if line)


_client = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY environment variable is not set")
        _client = genai.Client(api_key=api_key)
    return _client


def _now_iso() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _call_gemini(
    contents: Any,
    *,
    response_json_schema: dict[str, Any] | None = None,
    client: genai.Client | None = None,
    model: str | None = None,
) -> str:
    client = client or _get_client()
    model = model or GEMINI_MODEL
    config = genai_types.GenerateContentConfigDict(
        response_mime_type="application/json",
        thinking_config=genai_types.ThinkingConfigDict(
            thinking_level=genai_types.ThinkingLevel.LOW,
        ),
    )
    if response_json_schema is not None:
        config["response_json_schema"] = response_json_schema
    try:
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )
    except genai_errors.ClientError as exc:
        if getattr(exc, "code", None) == 429:
            raise RateLimitedError(str(exc)) from exc
        raise UpstreamServiceError(str(exc)) from exc
    except genai_errors.ServerError as exc:
        raise UpstreamServiceError(str(exc)) from exc

    text = getattr(response, "text", None)
    if not isinstance(text, str) or not text:
        raise UpstreamServiceError("Empty Gemini response")
    return text


def transform_content(
    operation: str,
    input_document: dict[str, Any],
    options: dict[str, Any] | None = None,
    *,
    client: genai.Client | None = None,
    model: str | None = None,
) -> dict[str, Any]:
    """Implements POST /api/v1/transformations. See docs/api.md.

    Args:
        operation: one of "simplify", "summarize", "restructure", "focus".
        input_document: {"format": "semantic_html", "html": str, "text": str,
            "language": str | None} — the "semantic document" shape from docs/api.md.
        options: passthrough dict merged into the prompt and echoed back in
            metadata.parameters, e.g. {"simplificationLevel": "moderate"}. Optional.

    Returns:
        {"output": {"format", "html", "text", "language"}, "metadata": {...}} —
        matches docs/api.md's transformation response shape exactly.

    Raises:
        ValueError: `operation` isn't one of the four supported strings — a bad-input
            bug from the caller, not a Gemini failure, so maps to 422, not 502.
        RateLimitedError, UpstreamServiceError: see errors.py — map to 429 / 502.

    note that this function is SYNCHRONOUS
    """
    if operation not in TRANSFORM_PROMPTS:
        raise ValueError(f"Unsupported operation: {operation}")

    prompt_version, prompt_text = TRANSFORM_PROMPTS[operation]
    options = options or {}

    source_html = input_document.get("html", "")
    source_text = input_document.get("text", "")
    source = (
        f"Content (semantic HTML):\n{source_html}"
        if isinstance(source_html, str) and source_html.strip()
        else f"Content (plain text):\n{source_text}"
    )
    full_prompt = (
        f"{prompt_text}\n\n"
        f"Options: {json.dumps(options)}\n\n"
        'Respond ONLY with compact JSON: {"html": string, "language": string|null}.\n\n'
        f"{source}"
    )

    raw = _call_gemini(
        [full_prompt],
        response_json_schema=_TRANSFORMATION_RESPONSE_JSON_SCHEMA,
        client=client,
        model=model,
    )
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise UpstreamServiceError(f"Gemini returned non-JSON output: {raw[:200]}") from exc

    output = {
        "format": "semantic_html",
        "html": parsed.get("html", ""),
        "text": _html_to_text(parsed.get("html", "")),
        "language": parsed.get("language") or input_document.get("language"),
    }
    metadata = {
        "operation": operation,
        "provider": "google",
        "model": model or GEMINI_MODEL,
        "promptVersion": prompt_version,
        "parameters": options,
        "performedAt": _now_iso(),
    }
    return {"output": output, "metadata": metadata}


def describe_image(
    kind: str,
    data_url: str,
    context_text: str | None = None,
    *,
    client: genai.Client | None = None,
    model: str | None = None,
) -> dict[str, Any]:
    """Implements POST /api/v1/image-descriptions.

    Args:
        kind: one of "img", "icon-button", "canvas" — controls which prompt is used
            and, for icon-button, forces role=None in the response.
        data_url: the image as a data: URL, e.g. "data:image/png;base64,....".
            Must be one of ALLOWED_IMAGE_MIME_TYPES and under MAX_IMAGE_BYTES decoded.
        context_text: optional nearby page text, appended to the prompt for context.

    Returns:
        {"altText": str, "role": str | None, "cached": False, "metadata": {...}}.
        "cached" is always False here — this function never checks a cache itself;
        see docs/ai-part-plan.md's open question on whether that's this function's
        job or the caller's.

    Raises:
        ValueError: `kind` isn't one of the three supported strings — maps to 422.
        UnsupportedMediaTypeError: bad data: URL, disallowed mime type, or invalid
            base64 — maps to 415.
        PayloadTooLargeError: decoded image exceeds MAX_IMAGE_BYTES — maps to 413.
        RateLimitedError, UpstreamServiceError: see errors.py — map to 429 / 502.

    Same sync/blocking caveat as transform_content().
    """
    if kind not in IMAGE_PROMPTS:
        raise ValueError(f"Unsupported kind: {kind}")

    match = _DATA_URL_RE.match(data_url or "")
    if not match:
        raise UnsupportedMediaTypeError("dataUrl is not a valid data: URL")

    mime_type, b64_data = match.group(1), match.group(2)
    if mime_type not in ALLOWED_IMAGE_MIME_TYPES:
        raise UnsupportedMediaTypeError(f"Unsupported image type: {mime_type}")

    try:
        decoded = base64.b64decode(b64_data, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise UnsupportedMediaTypeError("dataUrl base64 payload is invalid") from exc

    if len(decoded) > MAX_IMAGE_BYTES:
        raise PayloadTooLargeError(
            f"Image is {len(decoded)} bytes, exceeds the {MAX_IMAGE_BYTES}-byte limit"
        )

    prompt_version, prompt_text = IMAGE_PROMPTS[kind]
    full_prompt = (
        f'{prompt_text}\nRespond ONLY with compact JSON: {{"altText": string, "role": string}}.'
    )
    if context_text:
        full_prompt += f"\n\nNearby page text for context:\n{context_text}"

    contents = [
        {
            "role": "user",
            "parts": [
                {"text": full_prompt},
                {"inline_data": {"mime_type": mime_type, "data": b64_data}},
            ],
        }
    ]

    raw = _call_gemini(contents, client=client, model=model)
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {"altText": raw.strip()[:200], "role": None}

    role = parsed.get("role") if kind != "icon-button" else None
    if role not in {"img", "figure", "graphics-document", None}:
        role = None

    metadata = {
        "provider": "google",
        "model": model or GEMINI_MODEL,
        "promptVersion": prompt_version,
        "performedAt": _now_iso(),
    }
    return {
        "altText": parsed.get("altText") or "AI description unavailable",
        "role": role,
        "cached": False,
        "metadata": metadata,
    }
