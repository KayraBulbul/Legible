import { useDashboardContext } from "@/context/useDashboardContext";
import { CARD_HUES } from "@/data/mockPages";
import PageCard from "@/components/PageCard";

export default function PageGrid() {
  const {
    visiblePages,
    openReader,
    restorePage,
    deleteForever,
    moveToTrash,
    toggleFavorite,
    view,
  } = useDashboardContext();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {visiblePages.map((p, i) => (
        <PageCard
          key={p.id}
          page={p}
          hue={CARD_HUES[i % CARD_HUES.length]}
          onOpen={() => openReader(p)}
          onRestore={() => restorePage(p.id)}
          onDeleteForever={() => deleteForever(p.id)}
          onMoveToTrash={() => moveToTrash(p.id)}
          onToggleFavorite={() => toggleFavorite(p.id)}
          isTrash={view === "trash"}
        />
      ))}
    </div>
  );
}
