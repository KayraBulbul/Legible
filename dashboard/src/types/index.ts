/* ============================================================================
 * DOMAIN TYPES
 * ----------------------------------------------------------------------------
 * Field names deliberately track the API contract in docs/api.md so the
 * mapping in src/api stays thin. Dashboard-only concepts (trash) are flagged
 * where the contract does not cover them yet.
 * ==========================================================================*/

/** `accessibilitySettings.dyslexiaFont` in docs/api.md. */
export type FontMode = "none" | "lexend" | "opendyslexic";

/**
 * Mirrors `Theme` in context/themeContext.ts one-for-one, so the reader can
 * offer the same contrast choices — and the same colours — as the
 * dashboard's own theme, as an independent per-reader pick. This has drifted
 * from the `contrastMode` enum in docs/api.md (`none` | `dark` | `light`):
 * reading contrast is still local-only (see useReaderSettings.ts).
 */
export type ContrastMode = "light" | "dark" | "invert" | "high-contrast";

export interface SavedPage {
  id: string;
  title: string;
  domain: string;
  originalUrl: string;
  savedAt: string;
  favorited: boolean;
  trashed: boolean;
  tags: string[];
  dyslexiaFont: FontMode;
  contrastMode: ContrastMode;
  aiLabels: number;
}

/** The subset of a page the dashboard can edit. */
export type SavedPagePatch = Partial<
  Pick<SavedPage, "title" | "favorited" | "trashed" | "tags">
>;

export interface SemanticDocument {
  format: "semantic_html";
  html: string;
  text: string;
  language: string | null;
}

/**
 * The subset of `accessibilitySettings` (docs/api.md) the reader seeds its
 * local settings from. `contrastMode` is deliberately excluded — the wire
 * enum (`none`/`dark`/`light`) doesn't match `ContrastMode` above, and the
 * reader's contrast pick isn't sourced from here anyway (useReaderSettings.ts).
 */
export interface SavedAccessibilitySettings {
  dyslexiaFont: FontMode;
  bionicReading: boolean;
  fontScale: number;
  lineHeight: number | null;
  letterSpacing: number | null;
}

/** The reader's article body — fetched separately from `GET /saved-pages/{id}`. */
export interface SavedPageContent {
  sourceDocument: SemanticDocument;
  transformedDocument: SemanticDocument | null;
  accessibilitySettings: SavedAccessibilitySettings;
}

/* ---------------------------------------------------------------- navigation */

export type StaticView = "home" | "mypages" | "recent" | "favorited" | "trash";
export type View = StaticView;

export type ViewMode = "grid" | "list";
export type SortBy = "date" | "title";

/* -------------------------------------------------------------------- reader */

export type ToolPanel = "summary" | "simplify" | "restructure" | "focus" | null;

export interface ReaderSettings {
  dyslexiaFont: FontMode;
  contrastMode: ContrastMode;
  fontScale: number;
  bionicReading: boolean;
  letterSpacing: number;
  lineHeight: number;
}

/* ------------------------------------------------------------- async loading */

export type LoadStatus = "loading" | "ready" | "error";

/* ------------------------------------------------------------------------ ai */

/** `TextTransformationOperation` in docs/api.md — `POST /api/v1/transformations`. */
export type TransformOperation =
  | "simplify"
  | "summarize"
  | "restructure"
  | "focus";

/** `aiPreferences.simplificationLevel` in docs/api.md. */
export type SimplificationLevel = "light" | "moderate" | "strong";

/** `options` body of `POST /api/v1/transformations` — mirrors `AiPreferences`. */
export interface AiPreferences {
  simplificationLevel: SimplificationLevel;
  preserveTechnicalTerms: boolean;
}

/** One successful `POST /api/v1/transformations` call. */
export interface TransformResult {
  document: SemanticDocument;
  model: string;
  promptVersion: string;
  performedAt: string;
}
