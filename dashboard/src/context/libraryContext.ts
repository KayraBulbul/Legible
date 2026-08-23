import { createContext, useContext } from "react";
import type { LoadStatus, PageFolder, SavedPage } from "@/types";

/**
 * Everything the dashboard knows about the user's saved library: the data
 * itself, how loading it went, and the mutations that change it. Kept apart
 * from view state (see workspaceContext) so components that only read pages
 * don't re-render when a filter or a modal changes.
 */
export interface LibraryContextValue {
  pages: SavedPage[];
  folders: PageFolder[];
  status: LoadStatus;
  /** Load or mutation failure, already phrased for display. */
  error: string | null;
  dismissError: () => void;
  reload: () => void;

  /* Mutations are optimistic: the UI updates immediately and rolls back if
     the request fails, so the reader and the grid never wait on the network. */
  /** Explicit rather than a toggle: idempotent, and it maps straight to a PATCH body. */
  setFavorite: (id: string, favorited: boolean) => void;
  moveToTrash: (id: string) => void;
  restorePage: (id: string) => void;
  deleteForever: (id: string) => void;

  /** Rejects with a displayable message so the caller can report it inline. */
  createFolder: (name: string) => Promise<PageFolder>;
}

export const LibraryContext = createContext<LibraryContextValue | null>(null);

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within a LibraryProvider");
  return ctx;
}
