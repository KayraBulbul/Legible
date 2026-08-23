# A11y Reader — Dashboard

React + TypeScript + Vite front end for the saved-page library: browse, search,
organise into folders, and re-read saved pages with the accessibility controls
that were captured with them.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck (tsc -b) + production build
npm run lint
```

The dashboard runs standalone out of the box, against the fixtures in
`src/data`. No backend or environment file is needed to develop against it.

## Architecture

```
src/
  api/          the only place that talks to a server
  navigation/   view <-> URL mapping (pure, no React)
  context/      three providers, one concern each
  hooks/        reusable behaviour (dialogs, reader routing, reader settings)
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
