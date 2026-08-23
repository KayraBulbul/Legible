export type FontMode = "none" | "lexend" | "opendyslexic";
export type ContrastMode = "none" | "dark" | "warm";

export interface SavedPage {
  id: string;
  title: string;
  domain: string;
  savedAt: string; // ISO date
  folderId: string | null;
  favorited: boolean;
  trashed: boolean;
  fontMode: FontMode;
  contrastMode: ContrastMode;
  aiLabels: number;
}

export interface PageFolder {
  id: string;
  name: string;
  color: string; // Tailwind bg-* class
}

export type StaticView = "home" | "mypages" | "recent" | "favorited" | "trash";
export type View = StaticView | `folder:${string}`;

export type ViewMode = "grid" | "list";
export type SortBy = "date" | "title";
export type ToolPanel = "summary" | "simplify" | "focus" | null;
