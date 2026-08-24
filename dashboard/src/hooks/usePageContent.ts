import { useEffect, useState } from "react";
import type { LoadStatus, SavedPageContent } from "@/types";
import { getPageContent } from "@/api/pages";

interface PageContentState {
  status: LoadStatus;
  content: SavedPageContent | null;
}

const LOADING: PageContentState = { status: "loading", content: null };

/**
 * Fetches one saved page's article body. Separate from the page list the
 * reader is opened from, since list items never carry `sourceDocument` /
 * `transformedDocument` (docs/api.md) — only `GET /saved-pages/{id}` does.
 *
 * Callers must mount this with a `key` tied to `pageId` (ReaderModal already
 * is, for its own settings reset) — this hook relies on that remount to
 * reset state rather than resetting it itself when `pageId` changes.
 */
export function usePageContent(pageId: string): PageContentState {
  const [state, setState] = useState<PageContentState>(LOADING);

  useEffect(() => {
    const controller = new AbortController();

    getPageContent(pageId, controller.signal)
      .then((content) => setState({ status: "ready", content }))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setState({ status: "error", content: null });
      });

    return () => controller.abort();
  }, [pageId]);

  return state;
}
