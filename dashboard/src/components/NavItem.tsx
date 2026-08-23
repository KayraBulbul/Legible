import type { LucideIcon } from "lucide-react";
import cn from "@/utils/cn";

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}

export default function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-text-inverse"
          : "text-text-secondary hover:bg-accent-subtle hover:text-text-primary",
      )}
    >
      <Icon size={17} strokeWidth={2} />
      <span className="flex-1 text-left">{label}</span>
    </button>
  );
}
