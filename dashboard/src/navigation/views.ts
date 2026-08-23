import type { View } from "@/types";

/* ============================================================================
 * VIEW <-> URL MAPPING
 * ----------------------------------------------------------------------------
 * The router and the workspace context both read these, so a route only ever
 * needs adding in one place. Pure functions — no React, trivially testable.
 * ==========================================================================*/

export const VIEW_PATHS: Record<View, string> = {
  home: "/home",
  mypages: "/pages",
  recent: "/recent",
  favorited: "/favorites",
  trash: "/trash",
};

/** Page heading for each view. */
export const VIEW_TITLES: Record<View, string> = {
  home: "Home",
  mypages: "My saved pages",
  recent: "Recent",
  favorited: "Favorites",
  trash: "Trash",
};

/** Shorter labels for the sidebar, where width is tight. */
export const VIEW_NAV_LABELS: Record<View, string> = {
  home: "Home",
  mypages: "My pages",
  recent: "Recent",
  favorited: "Favorites",
  trash: "Trash",
};

export const HOME_PATH = VIEW_PATHS.home;

/** Reader deep links: /pages/:pageId. */
export const READER_PATH_PREFIX = "/pages/";

const PATH_TO_VIEW = new Map<string, View>(
  (Object.entries(VIEW_PATHS) as [View, string][]).map(([view, path]) => [
    path,
    view,
  ]),
);

export function viewToPath(view: View): string {
  return VIEW_PATHS[view] ?? HOME_PATH;
}

export function pathToView(pathname: string): View {
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
