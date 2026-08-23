import { Folder, FolderPlus } from "lucide-react";
import cn from "@/utils/cn";
import { useDashboardContext } from "@/context/useDashboardContext";

// Home-only folder shelf, similar to Drive's "Suggested folders".
export default function FolderShelf() {
  const { folders, setView, openNewFolder } = useDashboardContext();

  return (
    <div className="mb-6">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Folders
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {folders.map((f) => (
          <button
            key={f.id}
            onClick={() => setView(`folder:${f.id}`)}
            className="flex w-52 shrink-0 items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left hover:border-accent-muted hover:bg-accent-subtle"
          >
            {/* f.color is a decorative, theme-invariant swatch class */}
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg text-white",
                f.color,
              )}
            >
              <Folder size={16} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-text-primary">
                {f.name}
              </div>
            </div>
          </button>
        ))}
        <button
          onClick={openNewFolder}
          className="flex w-40 shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-medium text-text-secondary hover:border-accent-muted hover:text-accent"
        >
          <FolderPlus size={16} /> New folder
        </button>
      </div>
    </div>
  );
}
