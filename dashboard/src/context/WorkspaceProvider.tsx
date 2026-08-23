import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { SavedPage, SortBy, StaticView, View, ViewMode } from "@/types";
import {
  VIEW_TITLES,
  folderIdFromView,
  pathToView,
  viewToPath,
} from "@/navigation/views";
import { useLibrary } from "@/context/libraryContext";
import { useReaderRoute } from "@/hooks/useReaderRoute";
import {
  WorkspaceContext,
  type WorkspaceContextValue,
} from "@/context/workspaceContext";

/** Home and Recent are digests, not full listings. */
const RECENT_LIMIT = 6;

function sortPages(pages: SavedPage[], sortBy: SortBy): SavedPage[] {
  return pages.toSorted((a, b) =>
    sortBy === "title"
      ? a.title.localeCompare(b.title)
      : new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
}

function matchesQuery(page: SavedPage, query: string): boolean {
  return (
    page.title.toLowerCase().includes(query) ||
    page.domain.toLowerCase().includes(query)
  );
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { pages, folders, status } = useLibrary();
  const location = useLocation();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [newFolderOpen, setNewFolderOpen] = useState(false);

  // The URL is the source of truth for the view; a full-screen reader keeps
  // the view it was opened over (see pathToView).
  const view = pathToView(location.pathname);
  const setView = useCallback(
    (next: View) => navigate(viewToPath(next)),
    [navigate],
  );

  const activeFolderId = folderIdFromView(view);
  const activeFolder =
    folders.find((folder) => folder.id === activeFolderId) ?? null;

  const reader = useReaderRoute(pages, status === "ready");

  const visiblePages = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    const filtered = pages.filter((page) => {
      if (view === "trash" ? !page.trashed : page.trashed) return false;
      if (view === "favorited" && !page.favorited) return false;
      if (activeFolderId !== null && page.folderId !== activeFolderId) {
        return false;
      }
      return !trimmedQuery || matchesQuery(page, trimmedQuery);
    });

    const sorted = sortPages(filtered, sortBy);
    return view === "recent" || view === "home"
      ? sorted.slice(0, RECENT_LIMIT)
      : sorted;
  }, [pages, view, activeFolderId, query, sortBy]);

  const openNewFolder = useCallback(() => setNewFolderOpen(true), []);
  const closeNewFolder = useCallback(() => setNewFolderOpen(false), []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      view,
      setView,
      activeFolder,
      viewTitle: activeFolder?.name ?? VIEW_TITLES[view as StaticView],
      isTrashView: view === "trash",
      query,
      setQuery,
      viewMode,
      setViewMode,
      sortBy,
      setSortBy,
      visiblePages,
      readerPage: reader.readerPage,
      readerFullScreen: reader.fullScreen,
      openReader: reader.openReader,
      closeReader: reader.closeReader,
      enterReaderFullScreen: reader.enterFullScreen,
      exitReaderFullScreen: reader.exitFullScreen,
      newFolderOpen,
      openNewFolder,
      closeNewFolder,
    }),
    [
      view,
      setView,
      activeFolder,
      query,
      viewMode,
      sortBy,
      visiblePages,
      reader,
      newFolderOpen,
      openNewFolder,
      closeNewFolder,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
