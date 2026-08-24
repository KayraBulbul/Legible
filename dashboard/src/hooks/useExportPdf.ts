import { useCallback, useRef, useState } from "react";
import { ApiError } from "@/api/client";
import { exportSavedPagePdf } from "@/api/pages";

function describeExportError(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.code === "transformed_content_unavailable")
      return "This page has no AI-transformed version to export.";
    return cause.isUnauthorized
      ? "Your session has expired. Reconnect the extension to continue."
      : cause.message;
  }
  return "Could not export this page as a PDF.";
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Downloads a saved page as a PDF (`GET /saved-pages/{id}/export.pdf`,
 * docs/api.md). Shared by the overflow menu and the reader's export button so
 * both surfaces report busy/error state the same way instead of drifting.
 */
export function useExportPdf() {
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const exportPdf = useCallback((id: string) => {
    const thisRequest = ++latestRequest.current;
    setExportingId(id);
    setError(null);

    exportSavedPagePdf(id)
      .then(({ blob, filename }) => {
        if (latestRequest.current !== thisRequest) return;
        triggerDownload(blob, filename);
      })
      .catch((cause: unknown) => {
        if (latestRequest.current !== thisRequest) return;
        setError(describeExportError(cause));
      })
      .finally(() => {
        if (latestRequest.current === thisRequest) setExportingId(null);
      });
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  return { exportingId, error, exportPdf, dismissError };
}
