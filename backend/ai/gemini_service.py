"""Gemini-backed implementations of the two AI endpoints in docs/api.md:
POST /api/v1/transformations and POST /api/v1/image-descriptions.

This module is framework-agnostic: it knows nothing about FastAPI, auth, or the
database. It's meant to be imported and called from the actual route handlers.
"""
import base64
import binascii
import json
import os
import re
from datetime import datetime, timezone
from typing import Optional

from google import genai
from google.genai import errors as genai_errors

from .errors import (
    PayloadTooLargeError,
    RateLimitedError,
    UnsupportedMediaTypeError,
    UpstreamServiceError,
)
from .prompts import IMAGE_PROMPTS, TRANSFORM_PROMPTS

# gemini-2.5-flash are dead (404, "no longer available").
# gemini-3.7-flash returned repeated 503s ("high demand")
# The extension's gemini-client.js still needs updating separately (J's file).
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")

# ASSUMPTION: limits not yet agreed (docs/api.md lists these as "still need human
# agreement"). Placeholder values — change once the team decides.
MAX_IMAGE_BYTES = 8 * 1024 * 1024  # 8 MB
ALLOWED_IMAGE_MIME_TYPES = {"image/png", "image/jpeg", "image/webp", "image/svg+xml"}

_DATA_URL_RE = re.compile(r"^data:([^;]+);base64,(.*)$", re.DOTALL)

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
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _call_gemini(contents):
    client = _get_client()
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents,
            config={"temperature": 0.2, "response_mime_type": "application/json"},
        )
    except genai_errors.ClientError as exc:
        if getattr(exc, "code", None) == 429:
            raise RateLimitedError(str(exc)) from exc
        raise UpstreamServiceError(str(exc)) from exc
    except genai_errors.ServerError as exc:
        raise UpstreamServiceError(str(exc)) from exc

    text = getattr(response, "text", None)
    if not text:
        raise UpstreamServiceError("Empty Gemini response")
    return text


def transform_content(operation: str, input_document: dict, options: Optional[dict] = None) -> dict:
    """Implements POST /api/v1/transformations. See docs/api.md for the exact contract."""
    if operation not in TRANSFORM_PROMPTS:
        raise ValueError(f"Unsupported operation: {operation}")

    prompt_version, prompt_text = TRANSFORM_PROMPTS[operation]
    options = options or {}

    full_prompt = (
        f"{prompt_text}\n\n"
        f"Options: {json.dumps(options)}\n\n"
        'Respond ONLY with compact JSON: {"html": string, "text": string, '
        '"language": string|null}.\n\n'
        f"Content (semantic HTML):\n{input_document.get('html', '')}\n\n"
        f"Content (plain text fallback):\n{input_document.get('text', '')}"
    )

    raw = _call_gemini([full_prompt])
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise UpstreamServiceError(f"Gemini returned non-JSON output: {raw[:200]}") from exc

    output = { 
        "format": "semantic_html",
        "html": parsed.get("html", ""),
        "text": parsed.get("text", ""),
        "language": parsed.get("language") or input_document.get("language"),
    }
    metadata = {
        "operation": operation,
        "provider": "google",
        "model": GEMINI_MODEL,
        "promptVersion": prompt_version,
        "parameters": options,
        "performedAt": _now_iso(),
    }
    return {"output": output, "metadata": metadata}


def describe_image(kind: str, data_url: str, context_text: Optional[str] = None) -> dict:
    """Implements POST /api/v1/image-descriptions. See docs/api.md for the exact contract.

    NOTE: the "cached" field is set to False unconditionally here — this function does
    not check any cache itself. See docs/ai-part-plan.md's open question about whether
    caching belongs here or in the backend layer that calls this.
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

    raw = _call_gemini(contents)
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {"altText": raw.strip()[:200], "role": None}

    role = parsed.get("role") if kind != "icon-button" else None
    if role not in {"img", "figure", "graphics-document", None}:
        role = None

    metadata = {
        "provider": "google",
        "model": GEMINI_MODEL,
        "promptVersion": prompt_version,
        "performedAt": _now_iso(),
    }
    return {
        "altText": parsed.get("altText") or "AI description unavailable",
        "role": role,
        "cached": False,
        "metadata": metadata,
    }
