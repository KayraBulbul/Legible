import type { LucideIcon } from "lucide-react";
import cn from "@/utils/cn";

export interface PopupTooltipItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  danger?: boolean;
}

export interface PopupTooltipProps {
  items: PopupTooltipItem[];
  onClose: () => void;
}

export default function PopupTooltip({ items, onClose }: PopupTooltipProps) {
  return (
    <div
      role="menu"
      className="absolute right-0 top-full z-20 w-40 overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
    >
      {items.map(({ label, icon: Icon, onClick, danger }) => (
        <button
          key={label}
          role="menuitem"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            onClick();
          }}
          className={cn(
            "flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium hover:bg-surface-hover",
            danger ? "text-danger" : "text-primary",
          )}
        >
          <Icon size={13} /> {label}
        </button>
      ))}
    </div>
  );
}
