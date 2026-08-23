import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { SavedPage, SortBy, View, ViewMode } from "@/types";
import { VIEW_TITLES, pathToView, viewToPath } from "@/navigation/views";
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
    page.domain.toLowerCase().includes(query) ||
    page.tags.some((tag) => tag.includes(query))
  );
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { pages, status } = useLibrary();
  const location = useLocation();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("date");

  // The URL is the source of truth for the view; a full-screen reader keeps
  // the view it was opened over (see pathToView).
  const view = pathToView(location.pathname);
  const setView = useCallback(
    (next: View) => navigate(viewToPath(next)),
    [navigate],
  );

  const reader = useReaderRoute(pages, status === "ready");

  const visiblePages = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    const filtered = pages.filter((page) => {
      if (view === "trash" ? !page.trashed : page.trashed) return false;
      if (view === "favorited" && !page.favorited) return false;
      return !trimmedQuery || matchesQuery(page, trimmedQuery);
    });

    const sorted = sortPages(filtered, sortBy);
    return view === "recent" || view === "home"
      ? sorted.slice(0, RECENT_LIMIT)
      : sorted;
  }, [pages, view, query, sortBy]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      view,
      setView,
      viewTitle: VIEW_TITLES[view],
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
    }),
    [view, setView, query, viewMode, sortBy, visiblePages, reader],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
