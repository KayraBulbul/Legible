import { Star, Trash2, X } from "lucide-react";
import { useDashboardContext } from "@/context/useDashboardContext";

export default function BulkActionBar() {
  const { selected, bulkStar, bulkDelete, clearSelection } = useDashboardContext();

  if (selected.size === 0) return null;

  return (
    <div className="flex items-center gap-3 border-t border-stone-200 bg-white px-6 py-3">
      <span className="text-sm font-medium text-stone-600">{selected.size} selected</span>
      <button
        onClick={() => bulkStar(true)}
        className="flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-amber-300 hover:text-amber-600"
      >
        <Star size={13} /> Star
      </button>
      <button
        onClick={bulkDelete}
        className="flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-rose-300 hover:text-rose-600"
      >
        <Trash2 size={13} /> Move to trash
      </button>
      <button
        onClick={clearSelection}
        className="ml-auto rounded-full p-1.5 text-stone-400 hover:bg-stone-100"
      >
        <X size={15} />
      </button>
    </div>
  );
}
