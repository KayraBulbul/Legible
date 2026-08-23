import type { StaticView, View } from "@/types";

/* ============================================================================
 * VIEW <-> URL MAPPING
 * ----------------------------------------------------------------------------
 * The router and the workspace context both read these, so a route only ever
 * needs adding in one place. Pure functions — no React, trivially testable.
 * ==========================================================================*/

export const VIEW_PATHS: Record<StaticView, string> = {
  home: "/home",
  mypages: "/pages",
  recent: "/recent",
  favorited: "/favorites",
  trash: "/trash",
};

/** Page heading for each view. */
export const VIEW_TITLES: Record<StaticView, string> = {
  home: "Home",
  mypages: "My saved pages",
  recent: "Recent",
  favorited: "Favorites",
  trash: "Trash",
};

/** Shorter labels for the sidebar, where width is tight. */
export const VIEW_NAV_LABELS: Record<StaticView, string> = {
  home: "Home",
  mypages: "My pages",
  recent: "Recent",
  favorited: "Favorites",
  trash: "Trash",
};

export const HOME_PATH = VIEW_PATHS.home;

/** Reader deep links: /pages/:pageId. */
export const READER_PATH_PREFIX = "/pages/";
export const FOLDER_PATH_PREFIX = "/folders/";

const FOLDER_VIEW_PREFIX = "folder:";

const PATH_TO_VIEW = new Map<string, StaticView>(
  (Object.entries(VIEW_PATHS) as [StaticView, string][]).map(([view, path]) => [
    path,
    view,
  ]),
);

export function folderView(folderId: string): View {
  return `${FOLDER_VIEW_PREFIX}${folderId}`;
}

export function folderIdFromView(view: View): string | null {
  return view.startsWith(FOLDER_VIEW_PREFIX)
    ? view.slice(FOLDER_VIEW_PREFIX.length)
    : null;
}

export function viewToPath(view: View): string {
  const folderId = folderIdFromView(view);
  if (folderId !== null) {
    return `${FOLDER_PATH_PREFIX}${encodeURIComponent(folderId)}`;
  }
  return VIEW_PATHS[view as StaticView] ?? HOME_PATH;
}

export function pathToView(pathname: string): View {
  if (pathname.startsWith(FOLDER_PATH_PREFIX)) {
    const folderId = pathname.slice(FOLDER_PATH_PREFIX.length);
    if (folderId) return folderView(decodeURIComponent(folderId));
  }
  // A reader deep link keeps the library behind it on "My pages".
  if (pathname.startsWith(READER_PATH_PREFIX)) return "mypages";
  return PATH_TO_VIEW.get(pathname) ?? "home";
}

/** Extracts the page id from a reader deep link, if the path is one. */
export function readerPageIdFromPath(pathname: string): string | null {
  if (!pathname.startsWith(READER_PATH_PREFIX)) return null;
  const id = pathname.slice(READER_PATH_PREFIX.length);
  return id && !id.includes("/") ? decodeURIComponent(id) : null;
}
