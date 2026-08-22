# Gemini integration

This package contains the Google Gemini provider boundary used by:

- `POST /api/v1/transformations` for simplify, summarize, restructure, and focus;
- `POST /api/v1/image-descriptions` for accessible image descriptions.

The FastAPI application owns authentication, validation, sanitization, rate limiting,
timeouts, concurrency, and safe HTTP errors. `gemini_service.py` only translates typed
application requests into `google-genai` calls and validates structured provider output.

Dependencies are managed by the backend's `pyproject.toml` and `uv.lock`. Configuration
comes from the root `.env` locally and Railway variables in production. Never add an API
key below this directory.

The default model is `gemini-3.6-flash`. Set `GEMINI_MODEL` only when intentionally
changing the deployed model. The provider client is asynchronous and closes during the
FastAPI lifespan shutdown.

Images must be base64 data URLs containing PNG, JPEG, or WebP data no larger than 8 MiB
after decoding. SVG is deliberately rejected because active XML should not cross this
rendering boundary. AI results are returned synchronously and are not persisted unless a
client later saves a page with that result.
