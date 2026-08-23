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

The backend currently provides:

- guest-session creation, lookup, and revocation;
- authenticated display-name updates shared by paired sessions;
- PostgreSQL-backed guest, pairing-redemption, and Gemini rate limits shared by API instances;
- one-time pairing between an extension session and a dashboard session;
- saved-page creation with backend HTML sanitisation and idempotent retries;
- paginated saved-page summaries;
- saved-page detail, partial updates including favourite state and tags, and deletion;
- authenticated Gemini transformations and image descriptions;
- synchronous PDF export;
- ownership isolation for every authenticated operation.

Profiles remain planned. The repository OpenAPI includes Gemini transformations, image
descriptions, and PDF export. Check the production OpenAPI before assuming a deployment has
the same revision as `main`.

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

## Authentication flow

1. Call `POST /api/v1/auth/guest` once for a new client.
2. Store the returned `session.accessToken` in client-owned storage.
3. Send `Authorization: Bearer <accessToken>` on authenticated requests.
4. Use the pairing endpoints when the extension and dashboard need to share one user.
5. Read `displayName` from the pairing response or `GET /api/v1/auth/me`. If it is `null`,
   the dashboard may prompt once and save the answer with `PATCH /api/v1/auth/me`.
6. Clear a token after a `401` response or successful session revocation.

Guest creation defaults to 60 sessions per client address per hour and 1,000 sessions per
hour across the deployment. A rejected request returns `429 guest_session_rate_limited`.
In production, the client address comes from Railway's `X-Real-IP` header only when the
connection peer belongs to the configured trusted proxy networks.
Clients should reuse an existing valid token instead of creating a session on every launch.

Never log access tokens, place them in URLs, or expose them to browsed pages. Use `credentials: "omit"` for browser requests so source-site cookies are never sent to this backend.

Display names are optional presentation labels. They do not change authentication or
saved-page ownership. Send a non-blank string of at most 120 characters to set one, or `null`
to clear it. The backend trims and collapses whitespace before saving it.

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
- Read `tags` from list summaries and replace them with `PATCH /api/v1/saved-pages/{id}`. Tags
  are lowercase labels for client-side filtering; the backend does not filter by tag.
- Treat `404` as unavailable. The API intentionally returns the same result for missing and other-user resources.
- Request bodies are limited to 20 MiB.

The full settings shape, request examples, pairing flow, pagination contract, error envelope, AI limits, and planned endpoints are in [api.md](api.md).

## CORS and deployment

The production backend currently accepts the local dashboard origin `http://localhost:5173`. When the dashboard receives a public URL, add that exact origin to Railway's `CORS_ORIGINS` JSON array and redeploy the backend.

Railway must deploy the `main` branch from root directory `/backend`. The backend start command is:

```bash
uv run alembic upgrade head && uv run uvicorn api.main:app --host 0.0.0.0 --port $PORT --no-proxy-headers
```

Set `TRUSTED_PROXY_IPS=127.0.0.0/8,::1,10.0.0.0/8,100.0.0.0/8,172.16.0.0/12,192.168.0.0/16,fc00::/7`
on the Railway backend service. These are Railway's documented proxy ranges plus loopback. Do
not set it to `*`; untrusted peers must not be able to supply the address used for rate limits.
The `--no-proxy-headers` flag preserves the socket peer for this trust check. The backend reads
Railway's `X-Real-IP` itself and ignores `X-Forwarded-For`.

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
