import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LoadStatus, PageFolder, SavedPage, SavedPagePatch } from "@/types";
import { ApiError } from "@/api/client";
import { deletePage, listPages, updatePage } from "@/api/pages";
import { createFolder as requestFolder, listFolders } from "@/api/folders";
import {
  LibraryContext,
  type LibraryContextValue,
} from "@/context/libraryContext";

/** Turns anything thrown by the API layer into something worth showing a user. */
function describeError(cause: unknown, fallback: string): string {
  if (cause instanceof ApiError) {
    return cause.isUnauthorized
      ? "Your session has expired. Reconnect the extension to continue."
      : cause.message;
  }
  return fallback;
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [pages, setPages] = useState<SavedPage[]>([]);
  const [folders, setFolders] = useState<PageFolder[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      listPages(controller.signal),
      listFolders(controller.signal),
    ]).then(
      ([nextPages, nextFolders]) => {
        if (controller.signal.aborted) return;
        setPages(nextPages);
        setFolders(nextFolders);
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

  const moveToTrash = useCallback(
    (id: string) => patchPage(id, { trashed: true }),
    [patchPage],
  );

  const restorePage = useCallback(
    (id: string) => patchPage(id, { trashed: false }),
    [patchPage],
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

  /** Awaited rather than optimistic — the id has to come back from the store. */
  const createFolder = useCallback(async (name: string) => {
    try {
      const folder = await requestFolder(name);
      setFolders((current) => [...current, folder]);
      return folder;
    } catch (cause) {
      throw new Error(describeError(cause, "That folder could not be created."), {
        cause,
      });
    }
  }, []);

  const value = useMemo<LibraryContextValue>(
    () => ({
      pages,
      folders,
      status,
      error,
      dismissError,
      reload,
      setFavorite,
      moveToTrash,
      restorePage,
      deleteForever,
      createFolder,
    }),
    [
      pages,
      folders,
      status,
      error,
      dismissError,
      reload,
      setFavorite,
      moveToTrash,
      restorePage,
      deleteForever,
      createFolder,
    ],
  );

  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}
