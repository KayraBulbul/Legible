# Backend

FastAPI and PostgreSQL backend for saved accessibility snapshots. The current slice supports guest sessions, saving a page, listing the current user's pages, and retrieving one page.

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

Create separate Railway services for the backend and PostgreSQL. Set the backend service root directory to `backend/` and provide these environment variables through Railway rather than committing a `.env` file:

- `DATABASE_URL`, provided by the PostgreSQL service reference;
- `ENVIRONMENT=production`;
- `CORS_ORIGINS`, as a JSON array of allowed dashboard origins;
- `PAIRING_CODE_SECRET`, a random value containing at least 32 characters.

Use this backend start command:

```bash
uv run alembic upgrade head && uv run uvicorn api.main:app --host 0.0.0.0 --port $PORT
```

Railway normally injects `DATABASE_URL` with a `postgresql://` scheme. Backend configuration converts it to SQLAlchemy's `postgresql+asyncpg://` scheme without logging the URL.
