# AI Accessible Screen Reader & Web Restyler

A Manifest V3 Chrome extension combining dyslexia-friendly typography, high-contrast/de-clutter restyling, an AI (Gemini) vision-powered alt-text/ARIA enricher, and a keyboard-driven screen reader with synchronized highlighting.

## Load the extension

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this folder (`ScreenReader`).
4. Pin the extension from the toolbar puzzle-piece icon for quick access.

## Set up AI vision (optional but recommended)

1. Get a free Gemini API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Click the extension icon → **AI Vision (Gemini)** section → paste the key → **Save Key**.
3. The key is stored locally via `chrome.storage.local` and never leaves the browser except in direct calls to `generativelanguage.googleapis.com`.

Without a key, all typography/contrast/screen-reader features still work — only the AI alt-text/ARIA scan is disabled.

## Using it

- **Popup**: toggle dyslexia fonts (Lexend / OpenDyslexic), contrast themes, de-clutter mode, bionic reading, font size/line height, TTS voice/rate/pitch, and trigger an AI scan of the current page.
- **Floating HUD**: click the ♿ pill in the bottom-right corner of any page for the same controls without opening the popup.
- **Keyboard shortcuts** (customizable at `chrome://extensions/shortcuts`):
  - `Alt+R` — start/stop reading from the current position
  - `Alt+N` / `Alt+P` — next/previous readable element
  - `Alt+A` — run an AI vision scan on the hovered/focused image

## Notes

- `fonts/` bundles real Lexend (Google Fonts, OFL) and OpenDyslexic (OpenDyslexic project, OFL) font files for offline use.
- The AI scanner fetches each unlabeled image as a blob and sends it inline (base64) to Gemini — cross-origin images without CORS headers may fail to fetch; those get a dotted red outline instead of a dashed green one.
- Analysis results are cached in `chrome.storage.local` by a hash of the image source to avoid re-billing repeat scans.
