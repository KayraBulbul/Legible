import { useDashboardContext } from "@/context/useDashboardContext";
import PageRow from "@/components/PageRow";

export default function PageTable() {
  const {
    visiblePages,
    selected,
    toggleSelect,
    openReader,
    restorePage,
    deleteForever,
    view,
  } = useDashboardContext();

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
            <th className="w-8 px-4 py-2"></th>
            <th className="px-2 py-2 font-medium">Name</th>
            <th className="px-2 py-2 font-medium">Reading modes</th>
            <th className="px-2 py-2 font-medium">Saved</th>
            <th className="w-10 px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {visiblePages.map((p) => (
            <PageRow
              key={p.id}
              page={p}
              selected={selected.has(p.id)}
              onToggleSelect={() => toggleSelect(p.id)}
              onOpen={() => openReader(p)}
              onRestore={() => restorePage(p.id)}
              onDeleteForever={() => deleteForever(p.id)}
              isTrash={view === "trash"}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
