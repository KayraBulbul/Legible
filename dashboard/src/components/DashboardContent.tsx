import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { useLibrary } from "@/context/libraryContext";
import { useWorkspace } from "@/context/workspaceContext";
import EmptyState from "@/components/EmptyState";
import FolderShelf from "@/components/FolderShelf";
import PageGrid from "@/components/PageGrid";
import PageTable from "@/components/PageTable";

export default function DashboardContent() {
  const { status, error, reload, dismissError } = useLibrary();
  const { view, viewTitle, visiblePages, viewMode } = useWorkspace();

  return (
    <main id="main-content" className="flex-1 overflow-y-auto px-6 py-5">
      <h1 className="mb-4 font-display text-xl font-bold text-text-primary">
        {viewTitle}
      </h1>

      {error && (
        <ErrorBanner
          message={error}
          onRetry={status === "error" ? reload : undefined}
          onDismiss={dismissError}
        />
      )}

      {status === "loading" ? (
        <LoadingGrid />
      ) : status === "error" ? null : (
        <>
          {view === "home" && <FolderShelf />}

          {/* Announced politely so a screen-reader user hears the result count
              change as they type in the search box. */}
          <p
            aria-live="polite"
            className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary"
          >
            {view === "home"
              ? "Recently saved"
              : `${visiblePages.length} page${visiblePages.length === 1 ? "" : "s"}`}
          </p>

          {visiblePages.length === 0 ? (
            <EmptyState view={view} />
          ) : viewMode === "grid" ? (
            <PageGrid pages={visiblePages} />
          ) : (
            <PageTable pages={visiblePages} />
          )}
        </>
      )}
    </main>
  );
}

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss: () => void;
}

function ErrorBanner({ message, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="mb-4 flex items-center gap-3 rounded-xl border border-danger-muted bg-surface px-4 py-3 text-sm text-text-primary"
    >
      <AlertTriangle size={16} className="shrink-0 text-danger" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-text-secondary hover:bg-surface-hover"
        >
          <RefreshCw size={12} aria-hidden="true" /> Try again
        </button>
      )}
      <button
        onClick={onDismiss}
        aria-label="Dismiss message"
        className="rounded p-1 text-text-secondary hover:bg-surface-hover"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/** Placeholder tiles sized like real cards, so the layout doesn't jump. */
function LoadingGrid() {
  return (
    <div
      role="status"
      aria-label="Loading your saved pages"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={index}
          className="h-52 animate-pulse rounded-xl border border-border bg-surface-hover"
        />
      ))}
    </div>
  );
}
