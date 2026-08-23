import { useDashboardContext } from "@/context/useDashboardContext";
import FolderShelf from "@/components/FolderShelf";
import EmptyState from "@/components/EmptyState";
import PageGrid from "@/components/PageGrid";
import PageTable from "@/components/PageTable";

export default function DashboardContent() {
  const { view, viewTitle, visiblePages, viewMode } = useDashboardContext();

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">
      <h1
        className="mb-4 text-xl font-bold text-stone-900"
        style={{ fontFamily: "'Lexend', sans-serif" }}
      >
        {viewTitle}
      </h1>

      {view === "home" && <FolderShelf />}

      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
        {view === "home"
          ? "Recently saved"
          : `${visiblePages.length} page${visiblePages.length === 1 ? "" : "s"}`}
      </div>

      {visiblePages.length === 0 ? (
        <EmptyState view={view} />
      ) : viewMode === "grid" ? (
        <PageGrid />
      ) : (
        <PageTable />
      )}
    </div>
  );
}
