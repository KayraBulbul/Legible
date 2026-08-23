import { Check, ExternalLink, MoreVertical, RotateCcw } from "lucide-react";
import cn from "@/utils/cn";
import formatDate from "@/utils/formatDate";
import type { SavedPage } from "@/types";
import ModeBadges from "@/components/ModeBadges";

export interface PageItemActionsProps {
  page: SavedPage;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onRestore: () => void;
  onDeleteForever: () => void;
  isTrash: boolean;
}

interface PageCardProps extends PageItemActionsProps {
  hue: string;
}

export default function PageCard({
  page,
  hue,
  selected,
  onToggleSelect,
  onOpen,
  onRestore,
  onDeleteForever,
  isTrash,
}: PageCardProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-md",
        selected ? "border-violet-400 ring-2 ring-violet-100" : "border-stone-200",
      )}
    >
      <button
        onClick={onToggleSelect}
        className={cn(
          "absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-md border transition-opacity",
          selected
            ? "border-violet-600 bg-violet-600 text-white opacity-100"
            : "border-white bg-white/80 text-transparent opacity-0 group-hover:opacity-100",
        )}
      >
        <Check size={13} />
      </button>

      <button
        onClick={onOpen}
        className={cn(
          "flex h-24 items-center justify-center bg-gradient-to-br text-2xl font-bold text-white/90",
          hue,
        )}
      >
        {page.title.charAt(0)}
      </button>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <button
          onClick={onOpen}
          className="truncate text-left text-sm font-semibold text-stone-800 hover:text-violet-600"
        >
          {page.title}
        </button>
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span className="truncate">{page.domain}</span>
          <span className="shrink-0">{formatDate(page.savedAt)}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          <ModeBadges page={page} />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-stone-100 px-3 py-2">
        {isTrash ? (
          <>
            <button
              onClick={onRestore}
              className="flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-violet-600"
            >
              <RotateCcw size={13} /> Restore
            </button>
            <button
              onClick={onDeleteForever}
              className="text-xs font-medium text-rose-500 hover:text-rose-600"
            >
              Delete forever
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onOpen}
              className="flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-violet-600"
            >
              <ExternalLink size={13} /> Open
            </button>
            <button className="rounded p-1 text-stone-400 hover:bg-stone-100">
              <MoreVertical size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
