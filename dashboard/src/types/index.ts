/* ============================================================================
 * DOMAIN TYPES
 * ----------------------------------------------------------------------------
 * Field names deliberately track the API contract in docs/api.md so the
 * mapping in src/api stays thin. Dashboard-only concepts (folders, favorites,
 * trash) are flagged where the contract does not cover them yet.
 * ==========================================================================*/

/** `accessibilitySettings.dyslexiaFont` in docs/api.md. */
export type FontMode = "none" | "lexend" | "opendyslexic";

/**
 * `accessibilitySettings.contrastMode` in docs/api.md.
 * NOTE: the contract currently spells the third value `light`; the reader UI
 * calls it `warm`. Reconcile in the mapper (src/api/pages.ts) once settled.
 */
export type ContrastMode = "none" | "dark" | "warm";

export interface SavedPage {
  id: string;
  title: string;
  domain: string;
  /** ISO date or datetime — `capturedAt` on the wire. */
  savedAt: string;
  /** Dashboard-only: not in the API contract yet. */
  folderId: string | null;
  /** Dashboard-only: not in the API contract yet. */
  favorited: boolean;
  /** Dashboard-only: the contract deletes outright, with no trash state. */
  trashed: boolean;
  dyslexiaFont: FontMode;
  contrastMode: ContrastMode;
  /** Count of AI-generated labels applied to the snapshot. */
  aiLabels: number;
}

/** The subset of a page the dashboard can edit. */
export type SavedPagePatch = Partial<
  Pick<SavedPage, "title" | "folderId" | "favorited" | "trashed">
>;

export interface PageFolder {
  id: string;
  name: string;
}

/* ---------------------------------------------------------------- navigation */

export type StaticView = "home" | "mypages" | "recent" | "favorited" | "trash";
export type View = StaticView | `folder:${string}`;

export type ViewMode = "grid" | "list";
export type SortBy = "date" | "title";

/* -------------------------------------------------------------------- reader */

export type ToolPanel = "summary" | "simplify" | "focus" | null;

/** Mirrors the reader half of `accessibilitySettings` in docs/api.md. */
export interface ReaderSettings {
  dyslexiaFont: FontMode;
  contrastMode: ContrastMode;
  /** Percentage, 80–200. */
  fontScale: number;
  bionicReading: boolean;
}

/* ------------------------------------------------------------- async loading */

export type LoadStatus = "loading" | "ready" | "error";
