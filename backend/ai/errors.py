class GeminiError(Exception):
    """Base class for safe, provider-boundary failures."""


class GeminiRateLimitError(GeminiError):
    """The provider rejected the request because its quota was exhausted."""


class GeminiProviderError(GeminiError):
    """The provider failed or returned an unusable response."""


class GeminiUnavailableError(GeminiError):
    """The service is not configured for provider calls."""
