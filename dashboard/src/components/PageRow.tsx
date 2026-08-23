import type { SavedPage } from "@/types";
import formatDate from "@/utils/formatDate";
import ModeBadges from "@/components/ModeBadges";
import PageActionsMenu from "@/components/PageActionsMenu";
import { useLibrary } from "@/context/libraryContext";
import { useWorkspace } from "@/context/workspaceContext";

/** Table row for one saved page — the list-layout counterpart of PageCard. */
export default function PageRow({ page }: { page: SavedPage }) {
  const { restorePage, deleteForever } = useLibrary();
  const { openReader, isTrashView } = useWorkspace();

  return (
    <tr className="border-b border-border last:border-0 hover:bg-surface-hover">
      <td className="px-2 py-2.5 pl-4">
        <button
          onClick={() => openReader(page)}
          aria-label={`Open ${page.title}`}
          className="text-left"
        >
          <span className="block text-sm font-medium text-text-primary hover:text-accent">
            {page.title}
          </span>
          <span className="block text-xs text-text-secondary">
            {page.domain}
          </span>
        </button>
      </td>
      <td className="px-2 py-2.5">
        <div className="flex flex-wrap gap-1">
          <ModeBadges page={page} />
        </div>
      </td>
      <td className="px-2 py-2.5 text-xs text-text-secondary">
        {formatDate(page.savedAt)}
      </td>
      <td className="px-4 py-2.5 text-right">
        {isTrashView ? (
          <div className="flex justify-end gap-2">
            <button
              onClick={() => restorePage(page.id)}
              className="text-xs font-medium text-text-secondary hover:text-accent"
            >
              Restore
            </button>
            <button
              onClick={() => deleteForever(page.id)}
              className="text-xs font-medium text-danger hover:underline"
            >
              Delete
            </button>
          </div>
        ) : (
          <PageActionsMenu page={page} />
        )}
      </td>
    </tr>
  );
}
