# AI Accessible Screen Reader & Web Restyler

A Manifest V3 Chrome extension combining dyslexia-friendly typography, high-contrast/de-clutter restyling, an AI (Gemini) vision-powered alt-text/ARIA enricher, and a keyboard-driven screen reader with synchronized highlighting.

## Production backend

The FastAPI backend is deployed at [hackmelbourne2026-production.up.railway.app](https://hackmelbourne2026-production.up.railway.app). Useful links:

- [Health check](https://hackmelbourne2026-production.up.railway.app/health)
- [Interactive API documentation](https://hackmelbourne2026-production.up.railway.app/docs)
- [OpenAPI schema](https://hackmelbourne2026-production.up.railway.app/openapi.json)
- [Frontend integration guide](docs/README.md)
- [Full API contract](docs/api.md)

The deployed API supports anonymous guest sessions, one-time extension/dashboard pairing, and user-owned saved-page CRUD. Gemini transformations, image descriptions, profiles, and PDF export are still planned.

## Load the extension

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select `extension/`.
4. Pin the extension from the toolbar puzzle-piece icon for quick access.

## Set up legacy AI vision (optional prototype)

1. Get a free Gemini API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Click the extension icon → **AI Vision (Gemini)** section → paste the key → **Save Key**.
3. The key is stored locally via `chrome.storage.local` and never leaves the browser except in direct calls to `generativelanguage.googleapis.com`.

Without a key, all typography, contrast, and screen-reader features still work. Only the AI alt-text and ARIA scan is disabled.

This direct browser-to-Gemini path is legacy prototype behaviour. Do not build new features on it or ship its API key flow. Gemini calls will move behind the backend API so provider credentials remain on the server.

## Using it

- **Sidebar**: click the toolbar icon to open the side panel — theme presets (invert, dark, light, high-contrast), accessible & dyslexia fonts (**Lexend, OpenDyslexic, Atkinson Hyperlegible, Arial/Helvetica, Verdana, Open Sans, Comic Sans MS**), fine-grained text size/letter spacing/line height controls, highlight links, hide images, pause animations, de-clutter mode, bionic reading, a customizable on-page cursor, TTS voice/rate/pitch, and an AI scan of the current page.
- **Floating HUD**: click the ♿ pill in the bottom-right corner of any page for quick access to the same theme, highlight/hide, de-clutter, and bionic reading toggles without opening the sidebar.
- **Keyboard shortcuts** (customizable at `chrome://extensions/shortcuts`):
  - `Alt+R` — start/stop reading from the current position
  - `Alt+N` / `Alt+P` — next/previous readable element
  - `Alt+A` — run an AI vision scan on the hovered/focused image

## Notes

- `fonts/` bundles real Lexend (Google Fonts, OFL) and OpenDyslexic (OpenDyslexic project, OFL) font files for offline use.
- The AI scanner fetches each unlabeled image as a blob and sends it inline (base64) to Gemini — cross-origin images without CORS headers may fail to fetch; those get a dotted red outline instead of a dashed green one.
- Analysis results are cached in `chrome.storage.local` by a hash of the image source to avoid re-billing repeat scans.

## Dashboard development

This repository has multiple packages. To run the React dashboard locally:

```bash
cd dashboard
npm run dev
```

Vite will print a local URL (typically `http://localhost:5173`).
