import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { LoadStatus, SavedPage, SavedPagePatch } from "@/types";
import { ApiError } from "@/api/client";
import { deletePage, listPages, updatePage } from "@/api/pages";
import {
  LibraryContext,
  type LibraryContextValue,
} from "@/context/libraryContext";

/**
 * Fallback cadence for background revalidation while the dashboard tab is
 * open and visible. Focus/visibility revalidation (below) handles the common
 * case — switching back from the extension — near-instantly; this just
 * covers a dashboard tab left open and watched in the foreground.
 */
const BACKGROUND_REFRESH_INTERVAL_MS = 60_000;

/** Turns anything thrown by the API layer into something worth showing a user. */
function describeError(cause: unknown, fallback: string): string {
  if (cause instanceof ApiError) {
    return cause.isUnauthorized
      ? "Your session has expired. Reconnect the extension to continue."
      : cause.message;
  }
  return fallback;
}

/**
 * `trashed` is client-only (see {@link LibraryProvider}'s `setTrashed`) — the
 * server has no concept of it, so every list response reports `false`.
 * Background revalidation runs silently and often, so without this it would
 * routinely un-trash whatever the user had just moved to trash.
 */
function mergeTrashState(current: SavedPage[], next: SavedPage[]): SavedPage[] {
  const trashedIds = new Set(
    current.filter((page) => page.trashed).map((page) => page.id),
  );
  if (trashedIds.size === 0) return next;
  return next.map((page) =>
    trashedIds.has(page.id) ? { ...page, trashed: true } : page,
  );
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [pages, setPages] = useState<SavedPage[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([listPages(controller.signal)]).then(
      ([nextPages]) => {
        if (controller.signal.aborted) return;
        setPages(nextPages);
        setError(null);
        setStatus("ready");
      },
      (cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(describeError(cause, "Could not load your saved pages."));
        setStatus("error");
      },
    );

    return () => controller.abort();
  }, [reloadToken]);

  // Status is set here rather than inside the effect: the initial state is
  // already "loading", and an effect that writes state on every run just
  // triggers an extra render pass.
  const reload = useCallback(() => {
    setStatus("loading");
    setReloadToken((token) => token + 1);
  }, []);
  const dismissError = useCallback(() => setError(null), []);

  /**
   * Refetches without touching `status` or `error` — no spinner, no error
   * banner for a transient blip — so pages saved from the extension while
   * this tab sat in the background just appear next time it's looked at.
   */
  const isRevalidatingRef = useRef(false);
  const revalidate = useCallback(() => {
    if (isRevalidatingRef.current) return;
    isRevalidatingRef.current = true;
    listPages()
      .then((nextPages) => {
        setPages((current) => mergeTrashState(current, nextPages));
      })
      .catch(() => {
        // Background revalidation failing isn't worth surfacing; the next
        // focus, poll tick, or explicit reload will just try again.
      })
      .finally(() => {
        isRevalidatingRef.current = false;
      });
  }, []);

  // The extension saves pages from a separate tab (or window), so there's no
  // channel to push that save into this one — the dashboard has to notice.
  // The moment a user is most likely to expect a freshly saved page to show
  // up is switching back to this tab, so that's the primary trigger; a
  // fixed-interval poll on top covers a dashboard left open in the
  // foreground the whole time.
  useEffect(() => {
    const onFocus = () => revalidate();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") revalidate();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") revalidate();
    }, BACKGROUND_REFRESH_INTERVAL_MS);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(interval);
    };
  }, [revalidate]);

  /**
   * Applies a patch immediately, then reverts just that page if the request
   * fails — per page rather than per snapshot, so a failure can't undo an
   * unrelated edit that landed while it was in flight.
   */
  const patchPage = useCallback((id: string, patch: SavedPagePatch) => {
    let previous: SavedPage | undefined;
    setPages((current) =>
      current.map((page) => {
        if (page.id !== id) return page;
        previous = page;
        return { ...page, ...patch };
      }),
    );

    updatePage(id, patch).catch((cause: unknown) => {
      const restored = previous;
      if (restored) {
        setPages((current) =>
          current.map((page) => (page.id === id ? restored : page)),
        );
      }
      setError(describeError(cause, "That change could not be saved."));
    });
  }, []);

  const setFavorite = useCallback(
    (id: string, favorited: boolean) => patchPage(id, { favorited }),
    [patchPage],
  );

  const setTags = useCallback(
    (id: string, tags: string[]) => patchPage(id, { tags }),
    [patchPage],
  );

  /**
   * Trash has no server representation (docs/api.md doesn't model it, only a
   * hard `DELETE`) — so unlike {@link patchPage}, this never calls the API.
   * Sending `{ trashed }` through `updatePage` would map to an empty PATCH
   * body and the server rejects that with `422 validation_error`.
   */
  const setTrashed = useCallback((id: string, trashed: boolean) => {
    setPages((current) =>
      current.map((page) => (page.id === id ? { ...page, trashed } : page)),
    );
  }, []);

  const moveToTrash = useCallback(
    (id: string) => setTrashed(id, true),
    [setTrashed],
  );

  const restorePage = useCallback(
    (id: string) => setTrashed(id, false),
    [setTrashed],
  );

  const deleteForever = useCallback((id: string) => {
    let removed: { page: SavedPage; index: number } | undefined;
    setPages((current) => {
      const index = current.findIndex((page) => page.id === id);
      if (index === -1) return current;
      removed = { page: current[index], index };
      return current.toSpliced(index, 1);
    });

    deletePage(id).catch((cause: unknown) => {
      const restored = removed;
      if (restored) {
        setPages((current) =>
          current.toSpliced(restored.index, 0, restored.page),
        );
      }
      setError(describeError(cause, "That page could not be deleted."));
    });
  }, []);

  const value = useMemo<LibraryContextValue>(
    () => ({
      pages,
      status,
      error,
      dismissError,
      reload,
      setFavorite,
      setTags,
      moveToTrash,
      restorePage,
      deleteForever,
    }),
    [
      pages,
      status,
      error,
      dismissError,
      reload,
      setFavorite,
      setTags,
      moveToTrash,
      restorePage,
      deleteForever,
    ],
  );

  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}
