# A11y Reader — Dashboard

React + TypeScript + Vite front end for the saved-page library: browse, search,
organise into folders, and re-read saved pages with the accessibility controls
that were captured with them.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck (tsc -b) + production build
npm run lint
npm test         # standalone Vitest suite
npm run test:watch
```

The dashboard runs standalone out of the box, against the fixtures in
`src/data`. No backend or environment file is needed to develop against it.
The test suite forces mock mode and rejects unstubbed network requests, so it also runs without a
backend process, PostgreSQL, or Gemini credentials.

## Architecture

```
src/
  api/          the only place that talks to a server
  navigation/   view <-> URL mapping (pure, no React)
  context/      three providers, one concern each
  hooks/        reusable behaviour (dialogs, reader routing, reader settings, pairing)
  components/   presentation
  theme/        decorative swatch palette
  data/         mock fixtures, deleted once the API is live
```

### State

Three providers nest in dependency order, and nothing reaches past its own
concern:

| Provider | Owns | Used by |
|---|---|---|
| `ThemeProvider` | light/dark preference | `useTheme()` |
| `LibraryProvider` | saved pages, folders, and the mutations on them | `useLibrary()` |
| `WorkspaceProvider` | current view, filters, reader, dialogs | `useWorkspace()` |

`AuthProvider` sits above all three and gates them — see Pairing below.

### Pairing

The dashboard has no login and never creates a guest session of its own. It
joins one that already exists in the extension: the extension mints a one-time
code, the dashboard redeems it at `POST /auth/pairing-codes/redeem`, and the
token that comes back belongs to the **same anonymous user**.

Pairing links sessions; it copies nothing. Both clients resolve to one
`user.id`, and every saved-page request filters by that id, so they read and
write one library. A new guest session is a different user and therefore a
different library. Revoking one session leaves the other signed in.

Codes are eight characters from an alphabet that omits `I`, `O`, `0` and `1`,
work once, and expire ten minutes after they are issued. Creating a new one
retires the previous unused one, so only the newest code on screen works.

| Piece | Role |
|---|---|
| `utils/pairingCode.ts` | pure: cleans typed codes to the backend alphabet, formats the countdown |
| `api/auth.ts` | the wire calls — mint and redeem |
| `hooks/usePairingCode.ts` | owns one code and its countdown to expiry |
| `components/PairingScreen.tsx` | redeem side, shown whenever there is no valid session |
| `components/LinkDeviceModal.tsx` | mint side, from the account menu once paired |

The backend does no normalising, so a code pasted in lower case or with the
dashes people add when reading one off another screen would 422. Every entry
point runs `normalizePairingCode` first.

The countdown is recomputed from the absolute `expiresAt` on each tick rather
than decremented, because a backgrounded tab throttles its timers and a
sleeping machine stops them — a decremented counter would resume showing a
number from minutes ago. When it hits zero the code is struck through and
replaced with a prompt for a new one, rather than being left on screen for
someone to type and be told, with no explanation, that it is invalid.

Server state and view state are kept apart deliberately: typing in the search
box must not re-render anything that only reads pages, and a page mutation must
not disturb the current filter. State that only one component needs — a
half-typed folder name, the reader's active tool — stays in that component.

### Routing

The URL is the source of truth for the current view. `src/navigation/views.ts`
holds the whole mapping, so adding a view means editing one file, and the
router and providers can't drift apart.

The reader has two forms: **windowed** (local state, a dialog over the current
view) and **full screen** (`/pages/:id`, so it survives a refresh and can be
shared). `useReaderRoute` moves between them without ever blanking the reader
for a render, which would reset the settings the user just chose.

## Connecting the backend

`src/api` is the seam. Everything above it works in domain types
(`SavedPage`, `PageFolder`) and never sees a wire shape.

1. Set `VITE_API_BASE_URL` in `.env.local` (see `.env.example`). Mock mode
   switches off automatically as soon as it is set.
2. Store the session token with `setAccessToken()` from `src/api/client.ts`
   after guest creation or pairing — `apiRequest` attaches it to every call.
3. Delete the `USE_MOCK_API` branch from each repository function, and delete
   `src/data` plus `src/api/mock.ts`.

The live request paths are already written against the contract in
[`docs/api.md`](../docs/api.md), including the error envelope, `401` handling
and the list-response mapping. What still needs contract decisions is marked
`TODO(backend)` in the code:

- folders, favorites and trash are dashboard concepts with no endpoints yet, so
  they are held client-side;
- PDF export is disabled in the UI rather than silently doing nothing;
- the reader's summarize/simplify tools show sample copy until
  `POST /api/v1/transformations` exists;
- saved page content will need rendering through a sanitising component —
  never as raw HTML from the source site.

## Accessibility

The product is an accessibility tool, so the dashboard holds itself to the same
bar. Worth knowing before you change anything:

- theme tokens live in `src/index.css` and are the only source of colour; the
  `swatch-*` tokens are the deliberate exception, decorative and identical in
  both themes, and are always paired with white text;
- a focus ring is applied globally in `src/index.css` — don't remove it from a
  control without replacing it;
- every dialog uses `useDialog` for the focus trap, scroll lock and focus
  restore, and `useDismiss` for Escape;
- icons are `aria-hidden`; controls that show only an icon need a label;
- action labels include the page title, so a screen-reader user doesn't hear a
  page of buttons all called "Open";
- the theme is applied by an inline script in `index.html` before first paint,
  which is why that snippet duplicates the storage key from `themeContext.ts`.
