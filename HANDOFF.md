# Handoff — 2026-08-22

> Historical snapshot. It predates the saved-page client integration, Gemini backend routes,
> PDF export, and PostgreSQL-backed rate limits now present on `main`. Use `README.md`,
> `backend/README.md`, and `docs/api.md` for current status.

For a new Claude Code instance picking this up. Repo: `ScreenReaderv2` (Chrome extension + backend + dashboard monorepo).

## Repo state right now

- Layout just changed to a monorepo: `extension/`, `backend/`, `dashboard/`, `docs/`, `shared/` are now siblings at repo root. The extension used to be at repo root directly — if you see old paths like `background/background.js` in stale docs/memory, the real path is now `extension/background/background.js`.
- `main` is pushed and up to date with `origin` remote `Accessability-Browser-Extension` (`https://github.com/KayraBulbul/hackmelbourne2026`) as of commit `093cc97`.
- Loading the extension in Chrome: **point "Load unpacked" at `extension/`**, not the repo root.

## What happened this session

1. Fixed `extension/background/gemini-client.js` — model was hardcoded to the retired `gemini-2.0-flash` (404s). Confirmed via live curl tests that the user's Gemini API key works fine, just needed `gemini-3.6-flash`.
2. Explained/reviewed the AI Vision scan feature (`extension/content/ai-scanner.js`) — finds unlabeled `<img>`/icon-buttons/`<canvas>`, sends them to Gemini, writes back alt text/aria-label.
3. Surveyed a separate hackathon repo folder (`hackmelbourne2026-main`, now superseded — that was a stale local copy of the same upstream) and confirmed the real backend is live at `https://hackmelbourne2026-production.up.railway.app` (`/health`, `/openapi.json` both checked directly). Currently implemented: guest auth (`/api/v1/auth/guest`, `/auth/me`, pairing codes, session revoke) and saved-page CRUD (`/api/v1/saved-pages`). **Not implemented yet**: profiles, `/api/v1/transformations`, `/api/v1/image-descriptions`, PDF export — don't call these.
4. Designed (but did not implement) a plan to wire the extension to that backend — see "Deferred plan" below.
5. Local work (sidebar rewrite replacing the old popup, custom cursor, new themes/fonts) was committed (`a96f1cd`), then merged with 16 new upstream commits that had restructured the repo into the monorepo layout above (`093cc97`). Conflicts were mostly git's directory-rename-detection needing manual confirmation, plus one real conflict: upstream still had `popup/`, which we deleted in favor of the new `sidebar/` — resolved by keeping `extension/sidebar/` and dropping `extension/popup/`. All JS syntax-checked clean after the merge. Pushed to `main` on GitHub.

## Deferred plan: wire extension to the live backend

Full design is saved at `C:\Users\great\.claude\plans\effervescent-wibbling-cerf.md` (not yet executed). Summary:

- New `extension/background/api-client.js` — guest session creation + `authedFetch()` with the documented 401/409/413/422/502/503 handling.
- New `extension/background/settings-mapper.js` — converts the current `a11ySettings` shape (`extension/sidebar/sidebar.js`, `extension/content/content.js`) to the backend's `accessibilitySettings` schema. Current shape has several fields that don't map cleanly (`themeMode` has 5 values vs. backend's 3-value `contrastMode`; 5 extra `dyslexiaFont` values with no backend slot; no `wordSpacing`/`readingWidth`/`aiPreferences`/`schemaVersion` exist yet) — the plan file has the full mapping table with justifications.
- New `extension/content/extractor.js` — builds `{format:"semantic_html", html, text, language}` from the live page (nothing like this exists yet in the codebase).
- Sidebar gets a new "Account" section: an explicit **Connect** button (user decided against silent auto-bootstrap) that creates the guest session, plus a **Save This Page** button.
- `manifest.json` needs `https://hackmelbourne2026-production.up.railway.app/*` added to `host_permissions`.
- Base URL is hardcoded to production (user decided against a dev/local override field).
- Explicitly out of scope: pairing UI, profiles, transformations, image-descriptions, PDF export, and any saved-pages list/rename/delete UI (fast-follow after the save path works).

Next step if resuming this: re-enter plan mode or just start implementing directly since the design is already approved in spirit (the plan file itself wasn't re-approved after the git-sync detour, so a quick confirm before writing code is reasonable).

## Notes on the user

They have expressed a strong preference for concise replies (short, direct, no walls of text) — see `C:\Users\great\.claude\projects\c--Users-great-Downloads-Hackathon-ScreenReaderv2\memory\no-unsolicited-personal-memory.md` for the exact boundary they set (adapt tone in-conversation, but don't proactively write personal disclosures to memory).
