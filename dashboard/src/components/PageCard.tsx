import { ExternalLink, RotateCcw, Star } from "lucide-react";
import type { SavedPage } from "@/types";
import cn from "@/utils/cn";
import formatDate from "@/utils/formatDate";
import { swatchForId } from "@/theme/swatches";
import ModeBadges from "@/components/ModeBadges";
import PageActionsMenu from "@/components/PageActionsMenu";
import { useLibrary } from "@/context/libraryContext";
import { useWorkspace } from "@/context/workspaceContext";

/**
 * Grid tile for one saved page. Reads its own actions from context rather than
 * taking a callback per action, so the grid above it stays a plain list.
 */
export default function PageCard({ page }: { page: SavedPage }) {
  const { setFavorite, restorePage, deleteForever } = useLibrary();
  const { openReader, enterReaderFullScreen, isTrashView } = useWorkspace();

  return (
    <div className="group relative flex h-full flex-col rounded-xl border border-border bg-surface transition-shadow hover:shadow-md">
      {!isTrashView && (
        <button
          onClick={() => setFavorite(page.id, !page.favorited)}
          aria-label={
            page.favorited
              ? `Remove ${page.title} from favorites`
              : `Add ${page.title} to favorites`
          }
          aria-pressed={page.favorited}
          // Literal white: this sits on a swatch, which is the same colour in
          // both themes, so a theme token would go unreadable in one of them.
          className="absolute right-2 top-2 z-10 rounded-full p-1.5 text-white drop-shadow hover:scale-110"
        >
          <Star size={18} className={cn(page.favorited && "fill-white")} />
        </button>
      )}

      {/* overflow-hidden is scoped to the header, not the card, so it clips to
          the rounded corners without also clipping the actions menu below. */}
      <button
        onClick={() => openReader(page)}
        aria-label={`Open ${page.title}`}
        className={cn(
          "flex h-24 items-center justify-center overflow-hidden rounded-t-xl text-2xl font-bold text-white/90",
          swatchForId(page.id),
        )}
      >
        <span aria-hidden="true">{Array.from(page.title)[0] ?? "?"}</span>
      </button>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <button
          onClick={() => openReader(page)}
          className="truncate text-left text-sm font-semibold text-text-primary hover:text-accent"
        >
          {page.title}
        </button>
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span className="truncate">{page.domain}</span>
          <span className="shrink-0">{formatDate(page.savedAt)}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          <ModeBadges page={page} />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        {isTrashView ? (
          <>
            <button
              onClick={() => restorePage(page.id)}
              className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-accent"
            >
              <RotateCcw size={13} aria-hidden="true" /> Restore
            </button>
            <button
              onClick={() => deleteForever(page.id)}
              className="text-xs font-medium text-danger hover:underline"
            >
              Delete forever
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => enterReaderFullScreen(page.id)}
              // Without the title, a screen reader hears a page of buttons all
              // called "Open" with nothing to tell them apart.
              aria-label={`Open ${page.title} full screen`}
              className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-accent"
            >
              <ExternalLink size={13} aria-hidden="true" /> Open
            </button>
            <PageActionsMenu page={page} />
          </>
        )}
      </div>
    </div>
  );
}
