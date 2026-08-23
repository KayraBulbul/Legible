import { createContext } from "react";
import type { PageFolder, SavedPage, SortBy, View, ViewMode } from "@/types";

export interface DashboardContextValue {
  // Data (currently backed by mock fetches — see src/api)
  folders: PageFolder[];
  pages: SavedPage[];
  loading: boolean;

  // Navigation / filtering
  view: View;
  setView: (view: View) => void;
  activeFolder: PageFolder | null;
  viewTitle: string;
  query: string;
  setQuery: (query: string) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  sortBy: SortBy;
  setSortBy: (sortBy: SortBy) => void;
  visiblePages: SavedPage[];

  // Reader modal
  readerPage: SavedPage | null;
  openReader: (page: SavedPage) => void;
  closeReader: () => void;
  readerFullScreen: boolean;
  enterReaderFullScreen: (pageId: string) => void;
  exitReaderFullScreen: () => void;

  // New folder modal
  newFolderOpen: boolean;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  openNewFolder: () => void;
  closeNewFolder: () => void;
  createFolder: () => void;

  // Page mutations
  restorePage: (id: string) => void;
  deleteForever: (id: string) => void;
  moveToTrash: (id: string) => void;
  toggleFavorite: (id: string) => void;
}

export const DashboardContext = createContext<DashboardContextValue | null>(
  null,
);
