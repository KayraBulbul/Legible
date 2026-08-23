import { ChevronRight } from "lucide-react";
import { useLibrary } from "@/context/libraryContext";
import { useWorkspace } from "@/context/workspaceContext";
import PageCard from "@/components/PageCard";

/** Keeps the row to a single screenful — "Show all" is the way to see more. */
const SHELF_LIMIT = 6;

/** Home-only favorites row, with a link through to the full favorites view. */
export default function FavoritesShelf() {
  const { pages } = useLibrary();
  const { setView } = useWorkspace();

  const favorites = pages
    .filter((page) => page.favorited && !page.trashed)
    .slice(0, SHELF_LIMIT);

  if (favorites.length === 0) return null;

  return (
    <section aria-labelledby="favorites-shelf-heading" className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2
          id="favorites-shelf-heading"
          className="text-xs font-semibold uppercase tracking-wide text-text-secondary"
        >
          Favorites
        </h2>
        <button
          onClick={() => setView("favorited")}
          className="flex items-center gap-0.5 text-xs font-medium text-text-secondary hover:text-accent"
        >
          Show all
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="flex gap-4 overflow-visible pb-1">
        {favorites.map((page) => (
          <div key={page.id} className="w-52 shrink-0">
            <PageCard page={page} />
          </div>
        ))}
      </div>
    </section>
  );
}
