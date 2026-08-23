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
  /** `isFavourited` on the wire. */
  favorited: boolean;
  /** Dashboard-only: the contract deletes outright, with no trash state. */
  trashed: boolean;
  /**
   * Trimmed, case-folded, deduplicated, at most 20 entries of at most 50
   * characters each — the backend enforces this (docs/api.md); see
   * `src/utils/tags.ts` for the client-side mirror of those rules.
   */
  tags: string[];
  dyslexiaFont: FontMode;
  contrastMode: ContrastMode;
  /** Count of AI-generated labels applied to the snapshot. */
  aiLabels: number;
}

/** The subset of a page the dashboard can edit. */
export type SavedPagePatch = Partial<
  Pick<SavedPage, "title" | "favorited" | "trashed" | "tags">
>;

/* ---------------------------------------------------------------- navigation */

export type StaticView = "home" | "mypages" | "recent" | "favorited" | "trash";
export type View = StaticView;

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
  /** Em units, 0–0.3. */
  letterSpacing: number;
  /** Unitless line-height multiplier, 1.2–2.4. */
  lineHeight: number;
}

/* ------------------------------------------------------------- async loading */

export type LoadStatus = "loading" | "ready" | "error";
