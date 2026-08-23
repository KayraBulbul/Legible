import { Folder, FolderPlus } from "lucide-react";
import cn from "@/utils/cn";
import { swatchForId } from "@/theme/swatches";
import { useLibrary } from "@/context/libraryContext";
import { useWorkspace } from "@/context/workspaceContext";
import { folderView } from "@/navigation/views";

/** Home-only folder shelf, similar to Drive's "Suggested folders". */
export default function FolderShelf() {
  const { folders } = useLibrary();
  const { setView, openNewFolder } = useWorkspace();

  return (
    <section aria-labelledby="folder-shelf-heading" className="mb-6">
      <h2
        id="folder-shelf-heading"
        className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary"
      >
        Folders
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => setView(folderView(folder.id))}
            className="flex w-52 shrink-0 items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left hover:border-accent-muted hover:bg-accent-subtle"
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg text-white",
                swatchForId(folder.id),
              )}
            >
              <Folder size={16} />
            </span>
            <span className="min-w-0 truncate text-sm font-semibold text-text-primary">
              {folder.name}
            </span>
          </button>
        ))}
        <button
          onClick={openNewFolder}
          className="flex w-40 shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-medium text-text-secondary hover:border-accent-muted hover:text-accent"
        >
          <FolderPlus size={16} aria-hidden="true" /> New folder
        </button>
      </div>
    </section>
  );
}
