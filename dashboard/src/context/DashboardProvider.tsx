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
import countPages from "@/utils/countPages";
import {
  DashboardContext,
  type DashboardContextValue,
} from "@/context/dashboardContext";

const VIEW_LABELS: Record<StaticView, string> = {
  home: "Home",
  mypages: "My saved pages",
  recent: "Recent",
  starred: "Starred",
  trash: "Trash",
};

const VIEW_PATHS: Record<StaticView, string> = {
  home: "/home",
  mypages: "/pages",
  recent: "/recent",
  starred: "/starred",
  trash: "/trash",
};

function pathToView(pathname: string): View {
  const folderMatch = pathname.match(/^\/folders\/(.+)$/);
  if (folderMatch) return `folder:${decodeURIComponent(folderMatch[1])}`;
  const entry = Object.entries(VIEW_PATHS).find(
    ([, path]) => path === pathname,
  );
  return (entry?.[0] as StaticView) ?? "home";
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
  const view = pathToView(location.pathname);
  const setView = (next: View) => navigate(viewToPath(next));
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [readerPage, setReaderPage] = useState<SavedPage | null>(null);
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
    if (view === "starred") list = list.filter((p) => p.starred);
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

  const counts = useMemo(() => {
    const { starred, trash } = countPages(pages, null, {
      starred: true,
      trash: true,
    });
    const folders: Record<string, number> = {};
    for (const p of pages) {
      if (p.trashed || !p.folderId) continue;
      folders[p.folderId] = (folders[p.folderId] ?? 0) + 1;
    }
    return { starred: starred ?? 0, trash: trash ?? 0, folders };
  }, [pages]);

  const viewTitle = activeFolder
    ? activeFolder.name
    : VIEW_LABELS[view as StaticView];

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  // TODO(backend): PATCH /pages (bulk) once the endpoint exists.
  function bulkDelete() {
    setPages((prev) =>
      prev.map((p) => (selected.has(p.id) ? { ...p, trashed: true } : p)),
    );
    clearSelection();
  }

  function bulkStar(star: boolean) {
    setPages((prev) =>
      prev.map((p) => (selected.has(p.id) ? { ...p, starred: star } : p)),
    );
    clearSelection();
  }

  function restorePage(id: string) {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, trashed: false } : p)),
    );
  }

  function deleteForever(id: string) {
    setPages((prev) => prev.filter((p) => p.id !== id));
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
    counts,
    selected,
    toggleSelect,
    clearSelection,
    readerPage,
    openReader: setReaderPage,
    closeReader: () => setReaderPage(null),
    newFolderOpen,
    newFolderName,
    setNewFolderName,
    openNewFolder: () => setNewFolderOpen(true),
    closeNewFolder: () => setNewFolderOpen(false),
    createFolder,
    bulkDelete,
    bulkStar,
    restorePage,
    deleteForever,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
