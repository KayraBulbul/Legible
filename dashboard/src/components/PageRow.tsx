import { useEffect, useRef, useState } from "react";
import { FileDown, MoreVertical, Trash2 } from "lucide-react";
import formatDate from "@/utils/formatDate";
import ModeBadges from "@/components/ModeBadges";
import PopupTooltip from "@/components/PopupTooltip";
import type { PageItemActionsProps } from "@/components/PageCard";

export default function PageRow({
  page,
  onOpen,
  onRestore,
  onDeleteForever,
  onMoveToTrash,
  isTrash,
}: PageItemActionsProps) {
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
    <tr className="border-b border-border last:border-0 hover:bg-surface-hover">
      <td className="px-2 py-2.5 pl-4">
        <button onClick={onOpen} className="text-left">
          <div className="text-sm font-medium text-text-primary hover:text-accent">
            {page.title}
          </div>
          <div className="text-xs text-text-secondary">{page.domain}</div>
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
        {isTrash ? (
          <div className="flex justify-end gap-2">
            <button
              onClick={onRestore}
              className="text-xs font-medium text-text-secondary hover:text-accent"
            >
              Restore
            </button>
            <button
              onClick={onDeleteForever}
              className="text-xs font-medium text-danger hover:underline"
            >
              Delete
            </button>
          </div>
        ) : (
          <div ref={menuRef} className="relative inline-block">
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
        )}
      </td>
    </tr>
  );
}
