import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type {
  PageFolder,
  SavedPage,
  SortBy,
  StaticView,
  View,
  ViewMode,
} from "@/types";
import { fetchPages } from "@/api/pages";
import { fetchFolders } from "@/api/folders";
import { FOLDER_COLORS } from "@/data/mockFolders";
import {
  DashboardContext,
  type DashboardContextValue,
} from "@/context/dashboardContext";

const VIEW_LABELS: Record<StaticView, string> = {
  home: "Home",
  mypages: "My saved pages",
  recent: "Recent",
  favorited: "Favorites",
  trash: "Trash",
};

const VIEW_PATHS: Record<StaticView, string> = {
  home: "/home",
  mypages: "/pages",
  recent: "/recent",
  favorited: "/favorites",
  trash: "/trash",
};

function pathToView(pathname: string): View {
  const folderMatch = pathname.match(/^\/folders\/(.+)$/);
  if (folderMatch) return `folder:${decodeURIComponent(folderMatch[1])}`;
  if (/^\/pages\/.+$/.test(pathname)) return "mypages";
  const entry = Object.entries(VIEW_PATHS).find(
    ([, path]) => path === pathname,
  );
  return (entry?.[0] as StaticView) ?? "home";
}

interface BackgroundLocationState {
  background?: { pathname: string; search: string };
}

function viewToPath(view: View): string {
  if (view.startsWith("folder:")) {
    return `/folders/${encodeURIComponent(view.slice("folder:".length))}`;
  }
  return VIEW_PATHS[view as StaticView] ?? "/home";
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<PageFolder[]>([]);
  const [pages, setPages] = useState<SavedPage[]>([]);
  const [loading, setLoading] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();

  const pageIdMatch = location.pathname.match(/^\/pages\/([^/]+)$/);
  const pageId = pageIdMatch ? decodeURIComponent(pageIdMatch[1]) : undefined;
  const backgroundLocation =
    (location.state as BackgroundLocationState | null)?.background ?? null;
  const view = pathToView(backgroundLocation?.pathname ?? location.pathname);
  const setView = (next: View) => navigate(viewToPath(next));
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("date");

  const [windowedReaderPageId, setWindowedReaderPageId] = useState<
    string | null
  >(null);

  // Any real navigation away from the current URL should dismiss a windowed
  // reader left open from a previous page, rather than carrying it along.
  // exitReaderFullScreen deliberately converts full-screen -> windowed as
  // part of the same navigation, so it flags suppressReaderReset (set in the
  // same event-handler batch as the navigate call) to skip this reset once.
  const [suppressReaderReset, setSuppressReaderReset] = useState(false);
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname);
    if (suppressReaderReset) {
      setSuppressReaderReset(false);
    } else if (windowedReaderPageId !== null) {
      setWindowedReaderPageId(null);
    }
  }

  const readerFullScreen = Boolean(pageId);

  const urlReaderPage = pageId
    ? (pages.find((p) => p.id === pageId) ?? null)
    : null;
  const windowedReaderPage = windowedReaderPageId
    ? (pages.find((p) => p.id === windowedReaderPageId) ?? null)
    : null;
  const readerPage = urlReaderPage ?? windowedReaderPage;
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchPages(), fetchFolders()]).then(([p, f]) => {
      if (cancelled) return;
      setPages(p);
      setFolders(f);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeFolderId = view.startsWith("folder:") ? view.split(":")[1] : null;
  const activeFolder = folders.find((f) => f.id === activeFolderId) ?? null;

  const visiblePages = useMemo(() => {
    let list = pages.filter((p) => (view === "trash" ? p.trashed : !p.trashed));
    if (view === "favorited") list = list.filter((p) => p.favorited);
    if (activeFolderId)
      list = list.filter((p) => p.folderId === activeFolderId);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.domain.toLowerCase().includes(q),
      );
    }
    list = [...list].sort((a, b) =>
      sortBy === "title"
        ? a.title.localeCompare(b.title)
        : new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
    );
    if (view === "recent") list = list.slice(0, 6);
    return list;
  }, [pages, view, activeFolderId, query, sortBy]);

  const viewTitle = activeFolder
    ? activeFolder.name
    : VIEW_LABELS[view as StaticView];

  function restorePage(id: string) {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, trashed: false } : p)),
    );
  }

  function deleteForever(id: string) {
    setPages((prev) => prev.filter((p) => p.id !== id));
  }

  function moveToTrash(id: string) {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, trashed: true } : p)),
    );
  }

  function toggleFavorite(id: string) {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, favorited: !p.favorited } : p)),
    );
  }

  function navigateToBackground() {
    if (backgroundLocation) {
      navigate(`${backgroundLocation.pathname}${backgroundLocation.search}`);
    } else {
      navigate("/pages");
    }
  }

  function enterReaderFullScreen(id: string) {
    navigate(`/pages/${encodeURIComponent(id)}`, {
      state: {
        background: { pathname: location.pathname, search: location.search },
      },
    });
  }

  function exitReaderFullScreen() {
    // Keep the reader open in windowed form once we drop out of the URL.
    if (readerPage) {
      setSuppressReaderReset(true);
      setWindowedReaderPageId(readerPage.id);
    }
    navigateToBackground();
  }

  function closeReader() {
    setWindowedReaderPageId(null);
    if (pageId) navigateToBackground();
  }

  // TODO(backend): POST /folders once the endpoint exists.
  function createFolder() {
    if (!newFolderName.trim()) return;
    setFolders((prev) => [
      ...prev,
      {
        id: `f${Date.now()}`,
        name: newFolderName.trim(),
        color: FOLDER_COLORS[prev.length % FOLDER_COLORS.length],
      },
    ]);
    setNewFolderName("");
    setNewFolderOpen(false);
  }

  const value: DashboardContextValue = {
    folders,
    pages,
    loading,
    view,
    setView,
    activeFolder,
    viewTitle,
    query,
    setQuery,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    visiblePages,
    readerPage,
    openReader: (page) => setWindowedReaderPageId(page.id),
    closeReader,
    readerFullScreen,
    enterReaderFullScreen,
    exitReaderFullScreen,
    newFolderOpen,
    newFolderName,
    setNewFolderName,
    openNewFolder: () => setNewFolderOpen(true),
    closeNewFolder: () => setNewFolderOpen(false),
    createFolder,
    restorePage,
    deleteForever,
    moveToTrash,
    toggleFavorite,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
