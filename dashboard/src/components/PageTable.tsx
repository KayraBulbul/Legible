import { useDashboardContext } from "@/context/useDashboardContext";
import PageRow from "@/components/PageRow";

export default function PageTable() {
  const {
    visiblePages,
    openReader,
    restorePage,
    deleteForever,
    moveToTrash,
    view,
  } = useDashboardContext();

  return (
    <div className="rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-secondary">
            <th className="px-2 py-2 pl-4 font-medium">Name</th>
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
              onOpen={() => openReader(p)}
              onRestore={() => restorePage(p.id)}
              onDeleteForever={() => deleteForever(p.id)}
              onMoveToTrash={() => moveToTrash(p.id)}
              isTrash={view === "trash"}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
