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
      // aria-current is what tells a screen reader which view it is already
      // in — colour alone doesn't carry that.
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-text-inverse"
          : "text-text-secondary hover:bg-accent-subtle hover:text-text-primary",
      )}
    >
      <Icon size={17} strokeWidth={2} aria-hidden="true" />
      <span className="flex-1 truncate text-left">{label}</span>
    </button>
  );
}
