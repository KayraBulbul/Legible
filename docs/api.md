# Frontend API integration guide

This document is the integration contract for the browser extension and dashboard. The deployed FastAPI API implements health, guest sessions, session revocation, extension/dashboard pairing, and the complete saved-page lifecycle. Its Pydantic schemas and generated `/openapi.json` are authoritative for implemented endpoints. Other endpoints below are marked as planned.

## Environments

| Environment | Base URL |
|---|---|
| Production | `https://hackmelbourne2026-production.up.railway.app` |
| Local backend | `http://127.0.0.1:8000` |

Production links:

- Swagger UI: `https://hackmelbourne2026-production.up.railway.app/docs`
- OpenAPI JSON: `https://hackmelbourne2026-production.up.railway.app/openapi.json`
- Health: `https://hackmelbourne2026-production.up.railway.app/health`

Clients should read the base URL from environment-specific configuration rather than hard-coding it. The suggested dashboard variable is `VITE_API_BASE_URL`. The extension must grant host permission for the production origin and route requests through its service worker.

## System boundary

The API owns:

- guest identity, sessions, and extension/dashboard pairing;
- per-user saved pages and accessibility profiles;
- Gemini 3.6 Flash transformations and image descriptions;
- PDF generation for saved pages.

The extension owns live page transformations and extraction. Its Manifest V3 service worker makes backend requests. Content scripts should message the service worker instead of calling the API directly. The dashboard consumes saved-page, profile, transformation, and export endpoints.

The backend does not fetch `originalUrl`. Clients send extracted semantic content after the user chooses to save or transform a page.

## Common conventions

- Read the base URL from client configuration and append the paths documented below.
- Application routes start with `/api/v1`. Health is available at `/health`.
- Send JSON with `Content-Type: application/json`, except PDF responses.
- Authenticated requests use `Authorization: Bearer <accessToken>`.
- JSON fields use camelCase.
- Identifiers are UUID strings.
- Datetimes are ISO 8601 UTC strings, for example `2026-08-22T04:30:00Z`.
- Omitted optional fields and explicit `null` are not interchangeable unless a schema says so.
- The backend derives ownership from the access token. Never send a `userId` to select an owner.

The backend rejects request bodies larger than 20 MiB with `413 payload_too_large`.

The dashboard origin must be in the backend CORS allowlist. Production currently allows local dashboard development from `http://localhost:5173`; add the final dashboard origin when it is deployed. The extension manifest must grant host permission for the API origin. Extension requests should set `credentials: "omit"` so cookies from browsed sites are never forwarded.

`GET /health` returns `200 OK` when the application and database are ready:

```json
{
  "status": "ok",
  "database": "ok"
}
```

The dashboard may use this for a diagnostic state, but normal screens should handle failed API requests directly rather than polling it continuously.

## Endpoint summary

| Method | Path | Auth | Status | Purpose |
|---|---|---:|---|---|
| `GET` | `/health` | No | Current | Process and database health |
| `POST` | `/api/v1/auth/guest` | No | Current | Create a guest user and first session |
| `GET` | `/api/v1/auth/me` | Yes | Current | Read the current user |
| `POST` | `/api/v1/auth/pairing-codes` | Yes | Current | Create a one-time dashboard/extension pairing code |
| `POST` | `/api/v1/auth/pairing-codes/redeem` | No | Current | Exchange a pairing code for another session |
| `DELETE` | `/api/v1/auth/session` | Yes | Current | Revoke the current session |
| `POST` | `/api/v1/saved-pages` | Yes | Current | Save a page snapshot |
| `GET` | `/api/v1/saved-pages` | Yes | Current | List the current user's saved pages |
| `GET` | `/api/v1/saved-pages/{id}` | Yes | Current | Retrieve one full saved page |
| `PATCH` | `/api/v1/saved-pages/{id}` | Yes | Current | Rename a saved page |
| `DELETE` | `/api/v1/saved-pages/{id}` | Yes | Current | Delete a saved page |
| `GET` | `/api/v1/profiles` | Yes | Planned | List accessibility profiles |
| `POST` | `/api/v1/profiles` | Yes | Planned | Create a profile |
| `GET` | `/api/v1/profiles/{id}` | Yes | Planned | Retrieve a profile |
| `PATCH` | `/api/v1/profiles/{id}` | Yes | Planned | Update a profile |
| `DELETE` | `/api/v1/profiles/{id}` | Yes | Planned | Delete a profile |
| `POST` | `/api/v1/transformations` | Yes | Planned | Run a text/content transformation |
| `POST` | `/api/v1/image-descriptions` | Yes | Planned | Generate alt text or an accessible label |
| `GET` | `/api/v1/saved-pages/{id}/export.pdf` | Yes | Current | Generate and download a PDF |

Profiles may follow saved-page CRUD if time is tight. Their schema is still defined here so clients do not invent a second settings format.

## Authentication and user separation

The MVP uses anonymous guest users. It does not require email, password, login, or signup. Each client gets an opaque access token. A one-time code connects an extension session and dashboard session to the same user.

Guest-session creation, bearer-token validation, current-user lookup, session revocation, and pairing are implemented.

### Create a guest session

`POST /api/v1/auth/guest` returns `201 Created`:

```json
{
  "user": {
    "id": "28f13770-aae1-4c12-8378-6db19f48d8f2",
    "kind": "guest",
    "displayName": null,
    "createdAt": "2026-08-22T04:30:00Z"
  },
  "session": {
    "accessToken": "raw-token-returned-only-at-session-creation",
    "expiresAt": "2026-09-21T04:30:00Z"
  }
}
```

The extension creates this session on first use and stores the token in `chrome.storage.local`. Do not log it, put it in a URL, or send it to content scripts unless needed for a tightly scoped message. The dashboard should centralise token access in one auth module. Its persistent storage choice still needs agreement before implementation.

### Read the current user

`GET /api/v1/auth/me` returns `200 OK` with the `user` object above. A missing, invalid, expired, or revoked token returns `401`.

### Pair extension and dashboard

An authenticated client requests a code:

`POST /api/v1/auth/pairing-codes`

```json
{
  "code": "K7MP4X2Q",
  "expiresAt": "2026-08-22T04:40:00Z"
}
```

The other client redeems it:

`POST /api/v1/auth/pairing-codes/redeem`

```json
{
  "code": "K7MP4X2Q"
}
```

Successful redemption returns `201 Created` with the same shape as guest-session creation. It contains a new access token for the existing user.

Codes contain eight uppercase characters, expire after 10 minutes, and work once. Creating a new code invalidates any previous unused code for the same user. A user may create five codes per hour, and one client address may attempt redemption 10 times per 10 minutes.

`DELETE /api/v1/auth/session` revokes only the token used for that request and returns `204 No Content`.

## Shared data shapes

### Semantic document

The extension or Gemini service sends content in this form:

```json
{
  "format": "semantic_html",
  "html": "<article><h1>Example</h1><p>Readable content.</p></article>",
  "text": "Example\n\nReadable content.",
  "language": "en"
}
```

- `format` is `semantic_html` for v1.
- `html` is a semantic fragment, not a complete page document.
- `text` is the plain-text equivalent used for fallback display and AI input.
- `language` is an optional BCP 47 language tag.

Clients should remove extension controls and generated bionic wrappers before sending content. The backend sanitises HTML again. Scripts, inline event handlers, forms, iframes, unsafe URL schemes, and source-site credentials must never appear in a saved document.

### Accessibility settings

This is the versioned settings contract shared by profiles and saved-page snapshots:

```json
{
  "schemaVersion": 1,
  "dyslexiaFont": "none",
  "contrastMode": "none",
  "declutter": false,
  "bionicReading": false,
  "fontScale": 100,
  "lineHeight": null,
  "letterSpacing": null,
  "wordSpacing": null,
  "reducedMotion": false,
  "readingWidth": null,
  "ttsRate": 1.0,
  "ttsPitch": 1.0,
  "voiceURI": null,
  "hudVisible": true,
  "aiEnabled": true,
  "aiPreferences": {
    "simplificationLevel": "moderate",
    "preserveTechnicalTerms": true
  }
}
```

Current enum values are:

- `dyslexiaFont`: `none`, `lexend`, or `opendyslexic`;
- `contrastMode`: `none`, `dark`, or `light`;
- `aiPreferences.simplificationLevel`: `light`, `moderate`, or `strong`.

`fontScale` is a percentage and `lineHeight` is unitless. `letterSpacing` and `wordSpacing` use `em`; `readingWidth` uses `ch`. The PDF renderer bounds these values to safe print ranges: `-0.1` to `1em` for letter spacing, `-0.1` to `2em` for word spacing, and `30` to `120ch` for reading width. API responses return the full settings object with defaults applied.

### Transformation metadata

```json
{
  "operation": "simplify",
  "provider": "google",
  "model": "gemini-3.6-flash",
  "promptVersion": "simplify-v1",
  "parameters": {
    "simplificationLevel": "moderate"
  },
  "performedAt": "2026-08-22T04:32:00Z"
}
```

## Saved pages

A saved page is a user-owned snapshot. It is not unique by URL. The same user may save several versions of the same source page.

### Create

`POST /api/v1/saved-pages`

```json
{
  "clientSaveId": "930e52f9-dd2d-461e-a7e6-b78cf7a6a47f",
  "originalUrl": "https://example.com/article",
  "title": "Example article",
  "capturedAt": "2026-08-22T04:31:00Z",
  "sourceDocument": {
    "format": "semantic_html",
    "html": "<article><h1>Example article</h1><p>Original content.</p></article>",
    "text": "Example article\n\nOriginal content.",
    "language": "en"
  },
  "transformedDocument": null,
  "accessibilitySettings": {
    "schemaVersion": 1,
    "dyslexiaFont": "lexend",
    "contrastMode": "light",
    "declutter": true,
    "bionicReading": false,
    "fontScale": 120,
    "lineHeight": 1.8,
    "letterSpacing": null,
    "wordSpacing": null,
    "reducedMotion": true,
    "readingWidth": null,
    "ttsRate": 1.0,
    "ttsPitch": 1.0,
    "voiceURI": null,
    "hudVisible": true,
    "aiEnabled": true,
    "aiPreferences": {
      "simplificationLevel": "moderate",
      "preserveTechnicalTerms": true
    }
  },
  "transformations": [],
  "profileId": null
}
```

`clientSaveId` is generated once by the service worker before its first attempt. Retrying the same payload with the same authenticated user and `clientSaveId` returns `200 OK` with the existing saved page rather than creating a duplicate. Reusing that identifier for a different payload returns `409 Conflict`.

`profileId` must be `null` until the profiles API is implemented. The backend rejects non-null values rather than storing an ID it cannot validate for existence and ownership.

The backend returns `201 Created` for a new snapshot and a full saved-page response:

```json
{
  "id": "fa530413-094c-4353-873b-c8a2cb196811",
  "clientSaveId": "930e52f9-dd2d-461e-a7e6-b78cf7a6a47f",
  "originalUrl": "https://example.com/article",
  "title": "Example article",
  "excerpt": "Original content.",
  "sourceDocument": {
    "format": "semantic_html",
    "html": "<article><h1>Example article</h1><p>Original content.</p></article>",
    "text": "Example article\n\nOriginal content.",
    "language": "en"
  },
  "transformedDocument": null,
  "accessibilitySettings": {
    "schemaVersion": 1,
    "dyslexiaFont": "lexend",
    "contrastMode": "light",
    "declutter": true,
    "bionicReading": false,
    "fontScale": 120,
    "lineHeight": 1.8,
    "letterSpacing": null,
    "wordSpacing": null,
    "reducedMotion": true,
    "readingWidth": null,
    "ttsRate": 1.0,
    "ttsPitch": 1.0,
    "voiceURI": null,
    "hudVisible": true,
    "aiEnabled": true,
    "aiPreferences": {
      "simplificationLevel": "moderate",
      "preserveTechnicalTerms": true
    }
  },
  "transformations": [],
  "profileId": null,
  "sourceHash": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "capturedAt": "2026-08-22T04:31:00Z",
  "createdAt": "2026-08-22T04:31:02Z",
  "updatedAt": "2026-08-22T04:31:02Z"
}
```

### List

`GET /api/v1/saved-pages?limit=20&offset=0` returns `200 OK`:

```json
{
  "items": [
    {
      "id": "fa530413-094c-4353-873b-c8a2cb196811",
      "originalUrl": "https://example.com/article",
      "title": "Example article",
      "excerpt": "Original content.",
      "profileId": null,
      "hasTransformedContent": false,
      "capturedAt": "2026-08-22T04:31:00Z",
      "createdAt": "2026-08-22T04:31:02Z",
      "updatedAt": "2026-08-22T04:31:02Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 1
  }
}
```

The planned default is 20 items and maximum is 100. Items sort newest first. List responses do not contain full HTML or text.

### Retrieve, rename, and delete

- `GET /api/v1/saved-pages/{id}` returns the full saved-page response.
- `PATCH /api/v1/saved-pages/{id}` accepts `{ "title": "New title" }` and returns the updated full response.
- `DELETE /api/v1/saved-pages/{id}` returns `204 No Content`.

A missing page and a page owned by another user both return `404`. Clients must not infer that another user's page exists.

## Accessibility profiles

Profile endpoints are planned and are not present in the current OpenAPI schema.

Create with `POST /api/v1/profiles`:

```json
{
  "name": "Comfortable reading",
  "settings": {
    "schemaVersion": 1,
    "dyslexiaFont": "lexend",
    "contrastMode": "light",
    "declutter": true,
    "bionicReading": false,
    "fontScale": 120,
    "lineHeight": 1.8,
    "letterSpacing": null,
    "wordSpacing": null,
    "reducedMotion": true,
    "readingWidth": null,
    "ttsRate": 1.0,
    "ttsPitch": 1.0,
    "voiceURI": null,
    "hudVisible": true,
    "aiEnabled": true,
    "aiPreferences": {
      "simplificationLevel": "moderate",
      "preserveTechnicalTerms": true
    }
  },
  "isDefault": true
}
```

`settings` contains the complete settings object defined above. A profile response adds `id`, `createdAt`, and `updatedAt`. `GET /api/v1/profiles` returns `{ "items": [...] }`.

`PATCH /api/v1/profiles/{id}` accepts any combination of `name`, `settings`, and `isDefault`. `DELETE` returns `204`. Deleting or editing a profile does not alter the settings snapshot already stored with a saved page.

## Gemini transformations

Transformation endpoints are planned. `backend/ai/` is reserved for their implementation and is untouched by the persistence slice.

`POST /api/v1/transformations` runs a synchronous, authenticated transformation. It does not save a page.

```json
{
  "operation": "simplify",
  "input": {
    "format": "semantic_html",
    "html": "<article><p>Complex content.</p></article>",
    "text": "Complex content.",
    "language": "en"
  },
  "options": {
    "simplificationLevel": "moderate",
    "preserveTechnicalTerms": true
  }
}
```

Supported operations are `simplify`, `summarize`, `restructure`, and `focus`. A successful response is:

```json
{
  "output": {
    "format": "semantic_html",
    "html": "<article><p>Simpler content.</p></article>",
    "text": "Simpler content.",
    "language": "en"
  },
  "metadata": {
    "operation": "simplify",
    "provider": "google",
    "model": "gemini-3.6-flash",
    "promptVersion": "simplify-v1",
    "parameters": {
      "simplificationLevel": "moderate",
      "preserveTechnicalTerms": true
    },
    "performedAt": "2026-08-22T04:32:00Z"
  }
}
```

To retain a result, the client includes `output` as `transformedDocument` and `metadata` in `transformations` when creating a saved page. Keep the original source document so users can compare AI output against it.

## Image descriptions

Image-description endpoints are planned.

`POST /api/v1/image-descriptions` replaces the extension's direct Gemini image call.

```json
{
  "kind": "img",
  "dataUrl": "data:image/png;base64,...",
  "contextText": "Optional nearby page text"
}
```

`kind` is `img`, `icon-button`, or `canvas`. `contextText` is optional and must contain no form values or credentials. The response is:

```json
{
  "altText": "A concise accessible description.",
  "role": "img",
  "cached": false,
  "metadata": {
    "provider": "google",
    "model": "gemini-3.6-flash",
    "promptVersion": "image-description-v1",
    "performedAt": "2026-08-22T04:33:00Z"
  }
}
```

`role` may be `null` when no role should be added. The maximum decoded image size and accepted MIME types still need human agreement. Clients must handle `413`, `415`, `422`, `429`, and provider failure without disabling non-AI accessibility features.

## PDF export

`GET /api/v1/saved-pages/{id}/export.pdf?content=preferred` generates a PDF on demand. It returns `200 OK` with these headers:

- `Content-Type: application/pdf`
- `Content-Disposition`, with ASCII and RFC 5987 UTF-8 filenames derived from the saved title
- `X-Exported-Content: source` or `X-Exported-Content: transformed`

The `content` query accepts:

- `preferred`, the default, uses transformed content when present and source content otherwise;
- `source`, which always uses the saved source document;
- `transformed`, which returns `409 transformed_content_unavailable` when the saved page has no transformed document.

Missing pages and pages owned by another user return the same `404 saved_page_not_found` response. Rendering failures return `502 pdf_export_failed`. A render that exceeds 20 seconds returns `503 pdf_export_timeout`. When both renderer slots are occupied and a slot does not open within two seconds, the API returns `503 pdf_export_busy`.

Because an anchor cannot attach the bearer token, the dashboard should fetch the endpoint with the authorization header, read the response as a blob, and then create a temporary object URL for download. Revoke the object URL after use.

```ts
async function downloadSavedPagePdf(pageId: string, accessToken: string) {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/api/v1/saved-pages/${pageId}/export.pdf?content=preferred`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: "omit",
    },
  );

  if (!response.ok) {
    throw await response.json();
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const encodedFilename = /filename\*=UTF-8''([^;]+)/.exec(disposition)?.[1];
  const filename = encodedFilename
    ? decodeURIComponent(encodedFilename)
    : "saved-page.pdf";
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
```

PDF generation is synchronous and exports are not stored. The document uses A4 pages, heading bookmarks, clickable links, page numbers, and the selected document's language or `en` as a fallback. Print output applies the saved dyslexia font, font scale, spacing, line height, and reading width. It always uses black text on white. Speech, motion, contrast, HUD, and other screen-only settings do not affect the PDF.

Remote images are replaced with visible alt-text placeholders. The renderer does not fetch page assets or arbitrary local files. Supporting source images would need a separate asset pipeline and security review.

The backend asks WeasyPrint for tagged PDF/UA-1 output. This is a best-effort accessibility aid, not a claim of PDF/UA certification. WeasyPrint notes that conformance still depends on the source document and the PDF features used. See [WeasyPrint's PDF support](https://doc.courtbouillon.org/weasyprint/stable/api_reference.html#pdf).

## Errors and status codes

The API error envelope is:

```json
{
  "error": {
    "code": "validation_error",
    "message": "The request is invalid.",
    "fields": [
      {
        "path": "sourceDocument.html",
        "message": "This field is required."
      }
    ]
  }
}
```

`fields` is optional. Frontends should branch on HTTP status and `error.code`, not exact English messages.

| Status | Meaning |
|---:|---|
| `200` | Successful read, update, transformation, export, or idempotent save replay |
| `201` | User, session, page, or profile created |
| `204` | Successful deletion or session revocation |
| `400` | Malformed request outside normal schema validation |
| `401` | Missing, invalid, expired, or revoked token |
| `404` | Resource absent or owned by another user |
| `409` | Idempotency conflict or requested transformed export content is unavailable |
| `413` | Page or image payload too large |
| `415` | Unsupported image or content type |
| `422` | Pydantic validation failure |
| `429` | Pairing or Gemini rate limit reached |
| `502` | Upstream Gemini or PDF generation failure |
| `503` | Database, Gemini, or PDF service temporarily unavailable |

On `401`, clear the rejected session and offer guest creation or pairing. Do not retry `401`, `404`, `413`, or `422` automatically. Retry transient `502` or `503` failures only with a small bounded backoff. Reuse the original `clientSaveId` when retrying a saved-page create.

## Rendering saved content

The backend sanitises stored HTML, but clients must still treat it as untrusted:

- Render saved content only through the dashboard's reviewed sanitisation component.
- Do not execute scripts or inline event handlers.
- Open external links safely and prevent the saved document from controlling the dashboard window.
- Apply accessibility settings through owned dashboard or extension styles instead of trusting styles from the source page.
- Prefer `transformedDocument` when the user selects the transformed view; always retain access to `sourceDocument`.
- Never render page HTML in the extension popup or service-worker context.

## OpenAPI and generated client types

For the implemented backend:

- FastAPI exposes interactive documentation at [the production `/docs`](https://hackmelbourne2026-production.up.railway.app/docs) and its schema at [the production `/openapi.json`](https://hackmelbourne2026-production.up.railway.app/openapi.json).
- Export the generated schema to `shared/openapi.json` for clients and fixtures.
- Generate TypeScript types from OpenAPI if the dashboard and extension build setups support it.
- Do not hand-edit generated types or OpenAPI output.
- Contract changes require backend schema tests plus coordinated extension/dashboard updates.

Mock handlers should use these shapes and must be replaced or checked against generated OpenAPI before integration.

## Decisions still open

Frontend and backend owners need to settle these before implementation reaches the affected endpoint:

- dashboard token persistence and recovery behaviour for lost guest sessions;
- whether spacing and reading-width ranges should also be enforced when saving a page;
- content and image size limits plus accepted image MIME types;
- the HTML allowlist and treatment of remote images outside PDF export;
- whether profiles ship in the MVP;
- whether list pagination stays offset-based if the library grows beyond demo size.
