"""Exceptions the AI service raises.

Each maps to one of the HTTP status codes docs/api.md requires (413/415/429/502).
Whoever wires the actual FastAPI routes (Kayra) is expected to catch these and
translate them to the right status code for the client.
"""


class AiServiceError(Exception):
    """Base class for all AI-service failures."""


class PayloadTooLargeError(AiServiceError):
    """Maps to HTTP 413 — the image/content payload exceeds the allowed size."""


class UnsupportedMediaTypeError(AiServiceError):
    """Maps to HTTP 415 — the image type or data URL is not something we accept."""


class RateLimitedError(AiServiceError):
    """Maps to HTTP 429 — Gemini's own rate limit was hit."""


class UpstreamServiceError(AiServiceError):
    """Maps to HTTP 502 — Gemini failed or returned something unusable."""
