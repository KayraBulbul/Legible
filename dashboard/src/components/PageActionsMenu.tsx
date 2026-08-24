import { useCallback, useRef, useState } from "react";
import { AlertTriangle, FileDown, Loader2, MoreVertical, Trash2 } from "lucide-react";
import type { SavedPage } from "@/types";
import cn from "@/utils/cn";
import { useDismiss } from "@/hooks/useDismiss";
import { useExportPdf } from "@/hooks/useExportPdf";
import { useLibrary } from "@/context/libraryContext";

/**
 * Overflow menu for a saved page, shared by the grid card and the table row so
 * the two can never drift apart.
 */
export default function PageActionsMenu({ page }: { page: SavedPage }) {
  const { moveToTrash } = useLibrary();
  const { exportingId, error, exportPdf, dismissError } = useExportPdf();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const exporting = exportingId === page.id;

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
          <MenuItem
            icon={exporting ? Loader2 : FileDown}
            iconClassName={exporting ? "animate-spin" : undefined}
            disabled={exporting}
            onClick={() => exportPdf(page.id)}
          >
            {exporting ? "Exporting…" : "Export as PDF"}
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
          {error && (
            <div
              role="alert"
              className="flex items-start gap-1.5 border-t border-border px-3 py-2 text-[11px] text-danger"
            >
              <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span className="flex-1">{error}</span>
              <button
                onClick={dismissError}
                aria-label="Dismiss export error"
                className="shrink-0 text-danger/70 hover:text-danger"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  icon: typeof FileDown;
  iconClassName?: string;
  children: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function MenuItem({
  icon: Icon,
  iconClassName,
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
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium",
        disabled
          ? "cursor-not-allowed text-text-secondary/60"
          : "hover:bg-surface-hover",
        !disabled && (danger ? "text-danger" : "text-text-primary"),
      )}
    >
      <Icon size={13} className={iconClassName} /> {children}
    </button>
  );
}
