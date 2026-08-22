# Backend handoff

The production API is live at:

```text
https://hackmelbourne2026-production.up.railway.app
```

Reference links:

- [Health check](https://hackmelbourne2026-production.up.railway.app/health)
- [Swagger UI](https://hackmelbourne2026-production.up.railway.app/docs)
- [OpenAPI JSON](https://hackmelbourne2026-production.up.railway.app/openapi.json)
- [Detailed API contract](api.md)
- [Backend setup and deployment](../backend/README.md)

## What is available

The deployed API currently provides:

- guest-session creation, lookup, and revocation;
- one-time pairing between an extension session and a dashboard session;
- saved-page creation with backend HTML sanitisation and idempotent retries;
- paginated saved-page summaries;
- saved-page detail, partial updates including favourite state, and deletion;
- authenticated Gemini transformations and image descriptions;
- synchronous, best-effort accessible PDF export;
- ownership isolation for every authenticated operation.

Profiles remain planned. Gemini transformations, image descriptions, and PDF exports
appear in the current OpenAPI schema and may be called by authenticated clients.

## Client setup

Keep the API base URL in client configuration. For local dashboard development, use this suggested Vite variable in `dashboard/.env.local`:

```text
VITE_API_BASE_URL=https://hackmelbourne2026-production.up.railway.app
```

Do not commit `.env.local`. The extension should grant host permission for:

```json
"https://hackmelbourne2026-production.up.railway.app/*"
```

Extension HTTP requests must go through the Manifest V3 service worker. Content scripts should send typed runtime messages to the service worker instead of calling the backend directly.
The extension creates and stores a backend guest session on its first AI request. It no
longer asks users for a Gemini key or calls Google's API directly.

## Authentication flow

1. Call `POST /api/v1/auth/guest` once for a new client.
2. Store the returned `session.accessToken` in client-owned storage.
3. Send `Authorization: Bearer <accessToken>` on authenticated requests.
4. Use the pairing endpoints when the extension and dashboard need to share one user.
5. Clear a token after a `401` response or successful session revocation.

Never log access tokens, place them in URLs, or expose them to browsed pages. Use `credentials: "omit"` for browser requests so source-site cookies are never sent to this backend.

A basic authenticated request looks like:

```ts
const response = await fetch(`${apiBaseUrl}/api/v1/saved-pages`, {
  headers: { Authorization: `Bearer ${accessToken}` },
  credentials: "omit",
});

if (!response.ok) {
  const failure = await response.json();
  throw new Error(failure.error.code);
}

const library = await response.json();
```

## Saved-page rules clients must follow

- Generate one UUID `clientSaveId` for each save action. Reuse it when retrying that same payload.
- Send camelCase JSON and timezone-aware ISO 8601 timestamps.
- Keep `profileId` as `null` until the profiles API ships.
- Send semantic HTML fragments and equivalent plain text. Never send full page HTML, scripts, forms, cookies, credentials, or form values.
- Treat returned HTML as untrusted and sanitise again before rendering it.
- Use the list endpoint for library screens. It omits the large document fields by design.
- Read `isFavourited` from list summaries and update it with `PATCH /api/v1/saved-pages/{id}`.
- Treat `404` as unavailable. The API intentionally returns the same result for missing and other-user resources.
- Request bodies are limited to 20 MiB.

The full settings shape, request examples, pairing flow, pagination contract, error envelope, AI limits, and planned endpoints are in [api.md](api.md).

## CORS and deployment

The production backend currently accepts the local dashboard origin `http://localhost:5173`. When the dashboard receives a public URL, add that exact origin to Railway's `CORS_ORIGINS` JSON array and redeploy the backend.

Railway must deploy the `main` branch from root directory `/backend`. The backend start command is:

```bash
uv run alembic upgrade head && uv run uvicorn api.main:app --host 0.0.0.0 --port $PORT
```

The public Railway domain must target the same port as `$PORT`. The current deployment uses port `8080`. PostgreSQL stays in a separate private Railway service and the backend receives its connection string through a `DATABASE_URL` reference variable.

## Quick verification

```bash
curl -fsS https://hackmelbourne2026-production.up.railway.app/health
```

Expected response:

```json
{"status":"ok","database":"ok"}
```

Before changing a client contract, compare it with the live OpenAPI document. Backend schema changes require coordinated client changes and contract tests.
