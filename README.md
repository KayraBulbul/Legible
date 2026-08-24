# AI Accessible Screen Reader & Web Restyler

A Manifest V3 Chrome extension combining dyslexia-friendly typography, high-contrast/de-clutter restyling, an AI (Gemini) vision-powered alt-text/ARIA enricher, and a keyboard-driven screen reader with synchronized highlighting.

## Production backend

The FastAPI backend is deployed at [hackmelbourne2026-production.up.railway.app](https://hackmelbourne2026-production.up.railway.app). Useful links:

- [Health check](https://hackmelbourne2026-production.up.railway.app/health)
- [Interactive API documentation](https://hackmelbourne2026-production.up.railway.app/docs)
- [OpenAPI schema](https://hackmelbourne2026-production.up.railway.app/openapi.json)
- [Frontend integration guide](docs/README.md)
- [Full API contract](docs/api.md)

The backend implements anonymous guest sessions with optional display names, one-time
extension/dashboard pairing, user-owned saved-page CRUD, Gemini transformations and image
descriptions, and synchronous PDF export. Accessibility profiles remain planned. The
production deployment may lag behind `main` until its next successful deploy; use its OpenAPI
document to confirm the live version.

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

This direct browser-to-Gemini path is legacy prototype behaviour. Do not build new features on
it or ship its API key flow. The backend Gemini endpoints already exist, but the extension has
not yet migrated to them.

## Using it

- **Sidebar**: click the toolbar icon to open the side panel — theme presets (invert, dark, light, high-contrast), accessible & dyslexia fonts (**Lexend, OpenDyslexic, Atkinson Hyperlegible, Arial/Helvetica, Verdana, Open Sans, Comic Sans MS**), fine-grained text size/letter spacing/line height controls, highlight links, hide images, pause animations, de-clutter mode, bionic reading, a customizable on-page cursor, TTS voice/rate/pitch, and an AI scan of the current page.
- **Pomodoro Timer**: a focus/short-break countdown (customizable session lengths) that keeps running via `chrome.alarms` even while the panel is closed, with a toolbar badge countdown (`Nm`) and an optional desktop notification when a session ends.
- **Focus Sounds**: background ambience while reading, played continuously through an offscreen document independent of any tab. White Noise, Brown Noise, Ambient, Rain, Ocean, Lo-fi, and Classical are all generated on the fly in `extension/offscreen/offscreen.js` (noise/oscillator synthesis, not recordings) — no audio files needed. Nature → Forest is the one exception (birdsong isn't fakeable that way); it's wired up to play a file dropped into `extension/audio/nature/forest.mp3` (path documented in `MUSIC_LIBRARY` in `extension/background/background.js`) once one exists.
- **Floating HUD**: click the ♿ pill in the bottom-right corner of any page for quick access to the same theme, highlight/hide, de-clutter, and bionic reading toggles without opening the sidebar.
- **Linked devices**: the sidebar's Account section connects an anonymous guest session and saves pages to it. **Show a linking code** mints an eight-character code that another browser or the dashboard redeems to join the *same* anonymous user — a live countdown shows the ten minutes before it expires. Pairing links sessions, it does not copy pages: both clients then read one library, and signing out of one leaves the other signed in. See [Pairing](#pairing) below.
- **Keyboard shortcuts** (customizable at `chrome://extensions/shortcuts`):
  - `Alt+R` — start/stop reading from the current position
  - `Alt+N` / `Alt+P` — next/previous readable element
  - `Alt+A` — run an AI vision scan on the hovered/focused image

## Pairing

Saved pages belong to a user, not to a device. Every saved page stores the `user.id` its
session resolves to, and every list, read, update, delete, export and AI call filters by that
id — so two clients share a library exactly when they share a user.

Pairing is how a second client gets onto an existing user:

1. The extension creates a guest session (`POST /api/v1/auth/guest`). The backend creates a
   `User` and a 30-day session, and returns an access token — only the token's hash is stored.
2. That authenticated client asks for a code (`POST /api/v1/auth/pairing-codes`). The backend
   returns eight characters, keeps only an HMAC of them, sets a 10-minute expiry, and
   invalidates any earlier unused code for that user.
3. The second client redeems it (`POST /api/v1/auth/pairing-codes/redeem`). The backend
   verifies and consumes the code, then issues a *different* token for the *same* user.

What follows from that:

- Two paired clients see one saved-page library, because they resolve to one `user.id`.
- Nothing is copied anywhere. Pairing joins sessions; it is not sync.
- Creating a fresh guest session instead creates a **new user** and therefore an empty,
  separate library.
- Revoking one session (`DELETE /api/v1/auth/session`, or the dashboard's Sign out) leaves the
  paired session working.
- Another user cannot read a page even given its UUID — it comes back `404`.

Codes use an alphabet without `I`, `O`, `0` or `1` so they survive being read aloud, work
once, and expire ten minutes after they are issued. The backend normalises nothing, so both
clients strip spaces, dashes and case before sending. Both also count down to the deadline
from the absolute expiry instant and pull the code off screen when it lapses, rather than
leaving a dead code on display for someone to type.

Where to find it: **extension** → sidebar Account → Linked devices (mint and redeem).
**Dashboard** → the pairing screen shown when unpaired (redeem), and the account menu →
Link another device (mint). The full contract is in [docs/api.md](docs/api.md).

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
