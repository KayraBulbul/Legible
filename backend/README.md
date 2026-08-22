# Backend

FastAPI and PostgreSQL backend for guest sessions, extension/dashboard pairing, and user-owned saved accessibility snapshots. Saved pages support create, list, retrieve, update, favourite, delete, and synchronous PDF export operations.

## Requirements

- Python 3.14
- uv
- Docker with Compose

## Start locally

From the repository root:

```bash
docker compose up -d db
```

Then from `backend/`:

```bash
cp .env.example .env
uv sync
uv run alembic upgrade head
uv run fastapi dev api/main.py
```

The API is available at `http://127.0.0.1:8000`, interactive documentation at `/docs`, and health at `/health`.

Create a guest session first, then send its token as `Authorization: Bearer <accessToken>` to saved-page endpoints. The request and response contract is documented in `../docs/api.md`.

## Production

- API base URL: `https://hackmelbourne2026-production.up.railway.app`
- Health: `https://hackmelbourne2026-production.up.railway.app/health`
- Swagger UI: `https://hackmelbourne2026-production.up.railway.app/docs`
- OpenAPI: `https://hackmelbourne2026-production.up.railway.app/openapi.json`

The production health check currently returns `{"status":"ok","database":"ok"}`. Clients should keep the base URL in environment-specific configuration rather than repeating it throughout the codebase.

## Checks

The Compose database creates both `melbhack` and `melbhack_test` on first startup. Run these commands from `backend/`:

```bash
uv run ruff format --check .
uv run ruff check .
uv run mypy api database tests
uv run pytest
```

Tests use `postgresql+asyncpg://melbhack:melbhack@localhost:55432/melbhack_test` by default. Override it with `TEST_DATABASE_URL` when needed.

## Migrations

Create and review a migration after changing SQLAlchemy models:

```bash
uv run alembic revision --autogenerate -m "describe the change"
uv run alembic upgrade head
```

Do not use runtime `create_all` for application schema changes.

## Railway

Create separate Railway services for the backend and PostgreSQL. The backend service deploys the `main` branch with root directory `/backend`, health-check path `/health`, and a public domain that targets the injected application port.

Provide these environment variables through Railway rather than committing a `.env` file:

- `DATABASE_URL`, provided by the PostgreSQL service reference;
- `ENVIRONMENT=production`;
- `CORS_ORIGINS`, as a JSON array of allowed dashboard origins;
- `PAIRING_CODE_SECRET`, a random value containing at least 32 characters;
- `PDF_RENDER_TIMEOUT_SECONDS=20`, the hard limit for each renderer subprocess;
- `PDF_RENDER_CONCURRENCY=2`, the maximum renders handled by one API instance.

The current local dashboard origin can be configured as:

```text
CORS_ORIGINS=["http://localhost:5173"]
```

Add the production dashboard origin to this JSON array once it is deployed. Do not use `*` for production.

Requests are limited to 20 MiB by default. Set `MAX_REQUEST_BYTES` to change that limit.

`railpack.json` extends Railpack's runtime Apt packages with Pango, HarfBuzz font subsetting, and Noto fonts required by WeasyPrint, including CJK fallback fonts. Keep the `"..."` entry so Railpack retains its generated defaults. See [Railpack's package configuration](https://railpack.com/guides/installing-packages/).

PDFs are generated in short-lived subprocesses and are never stored. Lexend and OpenDyslexic are bundled under the SIL Open Font License. Noto Sans and Noto Sans CJK come from runtime packages and provide Unicode fallback glyphs. The renderer derives the base text direction from the saved document language and preserves safe `dir` attributes for mixed-direction content.

Use this backend start command:

```bash
uv run alembic upgrade head && uv run uvicorn api.main:app --host 0.0.0.0 --port $PORT
```

Railway normally injects `DATABASE_URL` with a `postgresql://` scheme. Backend configuration converts it to SQLAlchemy's `postgresql+asyncpg://` scheme without logging the URL.
