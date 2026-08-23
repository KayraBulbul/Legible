import type { LucideIcon } from "lucide-react";
import cn from "@/utils/cn";

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}

export default function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
  count,
}: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-violet-600 text-white"
          : "text-stone-300 hover:bg-stone-800 hover:text-white",
      )}
    >
      <Icon size={17} strokeWidth={2} />
      <span className="flex-1 text-left">{label}</span>
      {/* Render count badge */}
      {typeof count === "number" && count > 0 && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[11px]",
            active ? "bg-white/20" : "bg-stone-800 text-stone-400",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
