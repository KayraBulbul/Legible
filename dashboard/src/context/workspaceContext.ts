import { createContext, useContext } from "react";
import type { SavedPage, SortBy, View, ViewMode } from "@/types";

/**
 * How the library is currently being looked at: which view, filtered and
 * sorted how, with which page open in the reader. Purely client state — none
 * of it round-trips to the backend, which is exactly why it is kept out of
 * LibraryContext.
 */
export interface WorkspaceContextValue {
  /* Navigation */
  view: View;
  setView: (view: View) => void;
  viewTitle: string;
  /** Trash swaps the per-page actions for restore/delete everywhere. */
  isTrashView: boolean;

  /* Filtering and presentation */
  query: string;
  setQuery: (query: string) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  sortBy: SortBy;
  setSortBy: (sortBy: SortBy) => void;
  /** Pages for the current view, already filtered, sorted and capped. */
  visiblePages: SavedPage[];

  /* Reader */
  readerPage: SavedPage | null;
  readerFullScreen: boolean;
  openReader: (page: SavedPage) => void;
  closeReader: () => void;
  enterReaderFullScreen: (pageId: string) => void;
  exitReaderFullScreen: () => void;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(
  null,
);

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}
