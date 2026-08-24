# Legible

Legible is an accessibility layer for reading the web. Its Chrome extension changes how a live page looks and sounds, while the web dashboard keeps readable snapshots for later.

The extension and dashboard share one saved-page library through a FastAPI and PostgreSQL backend. A page is saved as sanitised semantic content with the accessibility settings that were active when it was captured.

## What it does

### Chrome extension

Load the extension on a normal web page and open its floating control panel from the toolbar. It can:

- switch between light, dark, inverted, and high-contrast page themes;
- use Lexend, OpenDyslexic, Atkinson Hyperlegible, Arial/Helvetica, Verdana, Open Sans, or Comic Sans MS;
- change font size, letter spacing, and line height;
- apply bionic reading, decluttering, link highlighting, image hiding, or paused animations;
- add a configurable on-page cursor;
- read the page aloud with keyboard navigation and synchronized highlighting;
- run a Pomodoro focus timer that keeps running when the panel is closed;
- play generated focus sounds, including white noise, rain, ocean, lo-fi, ambient, and classical sounds;
- extract the readable part of a page and save it to the shared library.

The live page settings stay local to the extension. Saving a page sends the page URL, title, capture time, extracted semantic content, and a settings snapshot through the service worker. It does not send cookies, credentials, forms, or browser storage.

### Web dashboard

The dashboard lets you browse and search saved pages, switch between grid and list views, sort by title or save date, mark pages as favourites, add tags, and open a saved page in the reader.

The saved reader restores the page's settings and adds:

- dyslexia-friendly font, contrast, size, spacing, bionic reading, and reading-width controls;
- fullscreen and focus modes;
- Gemini-backed summarize, simplify, restructure, and focus tools;
- on-demand PDF export of saved content.

AI requests and PDF generation run on the backend. Gemini credentials are never shipped in the extension or dashboard.

## Try the product

### Load the extension

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Select **Load unpacked** and choose the repository's `extension/` directory.
4. Open a regular web page and click the Legible toolbar icon.

The extension is configured to use the production API. In the panel, open **Account** and choose **Connect** before saving a page. The extension creates an anonymous guest session and stores its access token in extension storage.

### Open the dashboard

The hosted dashboard is available at [hackmelbourne2026.vercel.app](https://hackmelbourne2026.vercel.app/).

To run it locally from the repository root:

```bash
cd dashboard
npm install
npm run dev
```

Without an API URL, the dashboard uses local fixtures so its interface can be explored offline. To use the Railway API locally, create `dashboard/.env.local` with:

```text
VITE_API_BASE_URL=https://hackmelbourne2026-production.up.railway.app
```

The dashboard does not create a separate guest user. To share the extension's library, open **Account → Linked devices** in the extension, create a code, then enter it on the dashboard pairing screen. Pairing creates another session for the same anonymous user. It does not copy pages.

## Production services

- Frontend: [hackmelbourne2026.vercel.app](https://hackmelbourne2026.vercel.app/)
- FastAPI backend: [hackmelbourne2026-production.up.railway.app](https://hackmelbourne2026-production.up.railway.app)
- PostgreSQL database: hosted on Railway with the backend
- Gemini: called by the backend through its server-side credentials

Useful API links:

- [Health check](https://hackmelbourne2026-production.up.railway.app/health)
- [Interactive API documentation](https://hackmelbourne2026-production.up.railway.app/docs)
- [OpenAPI schema](https://hackmelbourne2026-production.up.railway.app/openapi.json)
- [API integration guide](docs/README.md)
- [Full API contract](docs/api.md)

The API currently handles anonymous guest sessions, display names, one-time extension/dashboard pairing, saved-page CRUD, favourites, tags, Gemini transformations, image descriptions, and synchronous PDF export. Accessibility profiles are planned.

## Run the backend locally

The backend uses Python 3.14, `uv`, FastAPI, SQLAlchemy, and PostgreSQL.

From the repository root, start PostgreSQL:

```bash
docker compose up -d db
```

Then configure and start the API:

```bash
cd backend
cp .env.example .env
# Set PAIRING_CODE_SECRET and GEMINI_API_KEY in .env
uv sync
uv run alembic upgrade head
uv run fastapi dev api/main.py
```

The local API runs at `http://127.0.0.1:8000`. Its Swagger UI is at `/docs` and its health check is at `/health`.

## Keyboard shortcuts

The extension shortcuts can be changed at `chrome://extensions/shortcuts`.

- `Alt+R` starts or stops reading from the current position.
- `Alt+N` moves to the next readable element.
- `Alt+P` moves to the previous readable element.

## How the pieces fit

```text
web page
   ↓
Legible extension: restyle, read aloud, extract
   ↓ service worker
FastAPI API → PostgreSQL saved-page library
   ↑
React dashboard: browse, reread, transform, export
```

The extension owns live tab settings. The backend owns sessions, pairing, saved pages, sanitisation, AI coordination, and exports. The dashboard consumes the backend contract in [`docs/api.md`](docs/api.md).

## Repository layout

```text
extension/  Manifest V3 extension, content scripts, service worker, and controls
backend/    FastAPI application, database models, migrations, AI, PDF export, and tests
dashboard/  React and TypeScript saved-page library and reader
docs/       API contract and client integration notes
shared/     Reserved for generated contracts and cross-client examples
```

## Checks

Backend checks run from `backend/`:

```bash
uv run ruff format --check .
uv run ruff check .
uv run mypy api database tests
uv run pytest
```

Dashboard checks run from `dashboard/`:

```bash
npm run build
npm run lint
npm test
```

The extension has no automated test setup yet. Load `extension/` as an unpacked extension and manually check it on a regular web page.

## Current limits

- Accessibility profiles are not implemented yet.
- The extension's live accessibility settings and the dashboard's saved-reader settings are related but not identical. The extension maps its current settings into the versioned saved-page settings contract when a page is saved.
- The dashboard can run against local fixtures or the API. The Railway backend must be configured with PostgreSQL and Gemini credentials for live persistence and AI tools.
