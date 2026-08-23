import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { SavedPage } from "@/types";
import {
  READER_PATH_PREFIX,
  VIEW_PATHS,
  readerPageIdFromPath,
} from "@/navigation/views";

/* ============================================================================
 * READER ROUTING
 * ----------------------------------------------------------------------------
 * The reader has two forms:
 *   full screen — owned by the URL (/pages/:id), so it is shareable and
 *                 survives a refresh or a back button;
 *   windowed    — owned by local state, a dialog over whatever view is behind.
 *
 * A windowed reader is stored with the pathname it was opened from, so leaving
 * that route drops it. Crossing between the two forms must never blank the
 * reader out for even one render — React would unmount it, and the reader's
 * font, contrast and tool state would silently reset — so the stamp survives
 * until the navigation has actually landed somewhere else.
 * ==========================================================================*/

interface BackgroundLocationState {
  background?: { pathname: string; search: string };
}

interface WindowedReader {
  pageId: string;
  pathname: string;
}

export interface ReaderRoute {
  readerPage: SavedPage | null;
  fullScreen: boolean;
  openReader: (page: SavedPage) => void;
  closeReader: () => void;
  enterFullScreen: (pageId: string) => void;
  exitFullScreen: () => void;
}

export function useReaderRoute(
  pages: SavedPage[],
  libraryLoaded: boolean,
): ReaderRoute {
  const location = useLocation();
  const navigate = useNavigate();
  const [windowed, setWindowed] = useState<WindowedReader | null>(null);

  const routePageId = readerPageIdFromPath(location.pathname);
  const background =
    (location.state as BackgroundLocationState | null)?.background ?? null;
  const backgroundPath = background
    ? `${background.pathname}${background.search}`
    : VIEW_PATHS.mypages;

  const findPage = (id: string | null) =>
    (id && pages.find((page) => page.id === id)) || null;

  const fullScreenPage = findPage(routePageId);
  const windowedPage =
    windowed?.pathname === location.pathname ? findPage(windowed.pageId) : null;

  // A stamp for another route is stale — unless it is the page currently open
  // full screen, which is mid-transition rather than abandoned. Dropping it
  // here (rather than in an effect) keeps a Back button from resurrecting a
  // reader the user had navigated away from.
  if (
    windowed &&
    windowed.pathname !== location.pathname &&
    windowed.pageId !== routePageId
  ) {
    setWindowed(null);
  }

  // A deep link to a page that no longer exists (deleted, or another user's)
  // must not leave the reader silently missing. Only once the library has
  // loaded, or every refresh would bounce off its own URL.
  useEffect(() => {
    if (libraryLoaded && routePageId && !fullScreenPage) {
      navigate(VIEW_PATHS.mypages, { replace: true });
    }
  }, [libraryLoaded, routePageId, fullScreenPage, navigate]);

  const openReader = useCallback(
    (page: SavedPage) =>
      setWindowed({ pageId: page.id, pathname: location.pathname }),
    [location.pathname],
  );

  const enterFullScreen = useCallback(
    (pageId: string) => {
      if (routePageId === pageId) return;
      // Deliberately not clearing `windowed` here: the router's update can
      // land in a separate render from this one, and a render where neither
      // form holds the page would unmount the reader mid-transition.
      navigate(`${READER_PATH_PREFIX}${encodeURIComponent(pageId)}`, {
        state: {
          background: { pathname: location.pathname, search: location.search },
        },
      });
    },
    [routePageId, location.pathname, location.search, navigate],
  );

  const exitFullScreen = useCallback(() => {
    if (!fullScreenPage) return;
    // Stay open, windowed, on the route we are returning to.
    setWindowed({
      pageId: fullScreenPage.id,
      pathname: background?.pathname ?? VIEW_PATHS.mypages,
    });
    navigate(backgroundPath);
  }, [fullScreenPage, background?.pathname, backgroundPath, navigate]);

  const closeReader = useCallback(() => {
    setWindowed(null);
    if (routePageId) navigate(backgroundPath);
  }, [routePageId, backgroundPath, navigate]);

  const readerPage = fullScreenPage ?? windowedPage;
  const fullScreen = Boolean(fullScreenPage);

  return useMemo(
    () => ({
      readerPage,
      fullScreen,
      openReader,
      closeReader,
      enterFullScreen,
      exitFullScreen,
    }),
    [
      readerPage,
      fullScreen,
      openReader,
      closeReader,
      enterFullScreen,
      exitFullScreen,
    ],
  );
}
