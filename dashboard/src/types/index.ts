/* ============================================================================
 * DOMAIN TYPES
 * ----------------------------------------------------------------------------
 * Field names deliberately track the API contract in docs/api.md so the
 * mapping in src/api stays thin. Dashboard-only concepts (trash) are flagged
 * where the contract does not cover them yet.
 * ==========================================================================*/

/** `accessibilitySettings.dyslexiaFont` in docs/api.md. */
export type FontMode = "none" | "lexend" | "opendyslexic";

/** Reader contrast choices, including dashboard-only invert and high-contrast modes. */
export type ContrastMode = "light" | "dark" | "invert" | "high-contrast";
export type SavedContrastMode = "none" | "dark" | "light";

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

/** The complete `accessibilitySettings` snapshot returned by the saved-page API. */
export interface SavedAccessibilitySettings {
  schemaVersion: 1;
  dyslexiaFont: FontMode;
  contrastMode: SavedContrastMode;
  declutter: boolean;
  bionicReading: boolean;
  fontScale: number;
  lineHeight: number | null;
  letterSpacing: number | null;
  wordSpacing: number | null;
  reducedMotion: boolean;
  readingWidth: number | null;
  ttsRate: number;
  ttsPitch: number;
  voiceURI: string | null;
  hudVisible: boolean;
  aiEnabled: boolean;
  aiPreferences: AiPreferences;
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
  declutter: boolean;
  fontScale: number;
  bionicReading: boolean;
  letterSpacing: number;
  wordSpacing: number;
  lineHeight: number;
  reducedMotion: boolean;
  readingWidth: number | null;
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
