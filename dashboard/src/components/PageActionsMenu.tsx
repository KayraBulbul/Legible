import { useCallback, useRef, useState } from "react";
import { FileDown, MoreVertical, Trash2 } from "lucide-react";
import type { SavedPage } from "@/types";
import cn from "@/utils/cn";
import { useDismiss } from "@/hooks/useDismiss";
import { useLibrary } from "@/context/libraryContext";

/**
 * Overflow menu for a saved page, shared by the grid card and the table row so
 * the two can never drift apart.
 */
export default function PageActionsMenu({ page }: { page: SavedPage }) {
  const { moveToTrash } = useLibrary();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useDismiss(open, containerRef, close);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={triggerRef}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${page.title}`}
        className="rounded p-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
      >
        <MoreVertical size={14} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={`Actions for ${page.title}`}
          className="absolute right-0 top-full z-20 w-44 overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
        >
          {/* TODO(backend): GET /api/v1/saved-pages/{id}/export.pdf — fetch with
              the bearer token, then download the blob (docs/api.md). Disabled
              rather than inert so it is honest to a keyboard or screen reader. */}
          <MenuItem icon={FileDown} disabled>
            Export as PDF
          </MenuItem>
          <MenuItem
            icon={Trash2}
            danger
            onClick={() => {
              close();
              moveToTrash(page.id);
            }}
          >
            Move to trash
          </MenuItem>
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  icon: typeof FileDown;
  children: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function MenuItem({
  icon: Icon,
  children,
  onClick,
  danger,
  disabled,
}: MenuItemProps) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? "Available once page export is connected" : undefined}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium",
        disabled
          ? "cursor-not-allowed text-text-secondary/60"
          : "hover:bg-surface-hover",
        !disabled && (danger ? "text-danger" : "text-text-primary"),
      )}
    >
      <Icon size={13} /> {children}
    </button>
  );
}
