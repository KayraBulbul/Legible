import { useEffect, useRef, useState } from "react";
import {
  ExternalLink,
  MoreVertical,
  RotateCcw,
  Star,
  Trash2,
  FileDown,
} from "lucide-react";
import cn from "@/utils/cn";
import formatDate from "@/utils/formatDate";
import type { SavedPage } from "@/types";
import ModeBadges from "@/components/ModeBadges";
import PopupTooltip from "@/components/PopupTooltip";
import { useDashboardContext } from "@/context/useDashboardContext";

export interface PageItemActionsProps {
  page: SavedPage;
  onOpen: () => void;
  onRestore: () => void;
  onDeleteForever: () => void;
  onMoveToTrash: () => void;
  isTrash: boolean;
}

interface PageCardProps extends PageItemActionsProps {
  hue: string;
  onToggleFavorite: () => void;
}

export default function PageCard({
  page,
  hue,
  onOpen,
  onRestore,
  onDeleteForever,
  onMoveToTrash,
  onToggleFavorite,
  isTrash,
}: PageCardProps) {
  const { enterReaderFullScreen } = useDashboardContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div className="group relative flex flex-col rounded-xl border border-border bg-surface transition-shadow hover:shadow-md">
      {!isTrash && (
        <div className="absolute right-2 top-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            aria-label={
              page.favorited ? "Remove from favorites" : "Add to favorites"
            }
            aria-pressed={page.favorited}
            className={
              "flex items-center justify-center rounded-full p-1.5 text-text-inverse hover:scale-110"
            }
          >
            <Star
              size={18}
              className={cn(
                page.favorited && "fill-text-inverse stroke-text-inverse",
              )}
            />
          </button>
        </div>
      )}

      {/* hue is a decorative, theme-invariant swatch class (see CARD_HUES) —
          paired with literal white text since the swatches are chosen to
          have enough contrast for white overlays regardless of app theme.
          overflow-hidden is scoped to this header (not the whole card) so it
          still clips to the rounded top corners without clipping the actions
          dropdown below. */}
      <button
        onClick={onOpen}
        className={cn(
          "flex h-24 items-center justify-center overflow-hidden rounded-t-xl text-2xl font-bold text-white/90",
          hue,
        )}
      >
        {page.title.charAt(0)}
      </button>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <button
          onClick={onOpen}
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
        {isTrash ? (
          <>
            <button
              onClick={onRestore}
              className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-accent"
            >
              <RotateCcw size={13} /> Restore
            </button>
            <button
              onClick={onDeleteForever}
              className="text-xs font-medium text-danger hover:underline"
            >
              Delete forever
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => enterReaderFullScreen(page.id)}
              className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-accent"
            >
              <ExternalLink size={13} /> Open
            </button>
            <div ref={menuRef} className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((open) => !open);
                }}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="More actions"
                className="rounded p-1 text-text-secondary hover:bg-surface-hover"
              >
                <MoreVertical size={14} />
              </button>
              {menuOpen && (
                <PopupTooltip
                  onClose={() => setMenuOpen(false)}
                  items={[
                    { label: "Export to PDF", icon: FileDown, onClick: () => {} },
                    {
                      label: "Move to trash",
                      icon: Trash2,
                      onClick: onMoveToTrash,
                      danger: true,
                    },
                  ]}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
