import { Check, MoreVertical } from "lucide-react";
import cn from "@/utils/cn";
import formatDate from "@/utils/formatDate";
import ModeBadges from "@/components/ModeBadges";
import type { PageItemActionsProps } from "@/components/PageCard";

export default function PageRow({
  page,
  selected,
  onToggleSelect,
  onOpen,
  onRestore,
  onDeleteForever,
  isTrash,
}: PageItemActionsProps) {
  return (
    <tr
      className={cn(
        "border-b border-stone-100 last:border-0 hover:bg-stone-50",
        selected && "bg-violet-50",
      )}
    >
      <td className="px-4 py-2.5">
        <button
          onClick={onToggleSelect}
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded border",
            selected
              ? "border-violet-600 bg-violet-600 text-white"
              : "border-stone-300 text-transparent",
          )}
        >
          <Check size={11} />
        </button>
      </td>
      <td className="px-2 py-2.5">
        <button onClick={onOpen} className="text-left">
          <div className="text-sm font-medium text-stone-800 hover:text-violet-600">
            {page.title}
          </div>
          <div className="text-xs text-stone-400">{page.domain}</div>
        </button>
      </td>
      <td className="px-2 py-2.5">
        <div className="flex flex-wrap gap-1">
          <ModeBadges page={page} />
        </div>
      </td>
      <td className="px-2 py-2.5 text-xs text-stone-400">{formatDate(page.savedAt)}</td>
      <td className="px-4 py-2.5 text-right">
        {isTrash ? (
          <div className="flex justify-end gap-2">
            <button
              onClick={onRestore}
              className="text-xs font-medium text-stone-500 hover:text-violet-600"
            >
              Restore
            </button>
            <button
              onClick={onDeleteForever}
              className="text-xs font-medium text-rose-500 hover:text-rose-600"
            >
              Delete
            </button>
          </div>
        ) : (
          <button className="rounded p-1 text-stone-400 hover:bg-stone-100">
            <MoreVertical size={14} />
          </button>
        )}
      </td>
    </tr>
  );
}
