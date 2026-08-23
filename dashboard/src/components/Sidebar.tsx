import {
  Accessibility,
  Clock,
  FileText,
  Home,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { StaticView } from "@/types";
import { VIEW_NAV_LABELS } from "@/navigation/views";
import NavItem from "@/components/NavItem";
import { useWorkspace } from "@/context/workspaceContext";

/** Order matters here — it is the order they appear in the sidebar. */
const NAV_ITEMS: { view: StaticView; icon: LucideIcon }[] = [
  { view: "home", icon: Home },
  { view: "mypages", icon: FileText },
  { view: "recent", icon: Clock },
  { view: "favorited", icon: Star },
  { view: "trash", icon: Trash2 },
];

export default function Sidebar() {
  const { view, setView } = useWorkspace();

  return (
    <nav
      aria-label="Library"
      className="flex w-64 shrink-0 flex-col gap-1 border-r border-border bg-surface p-4"
    >
      <button
        onClick={() => (window.location.href = "/")}
        className="mb-4 flex items-center gap-2 px-2"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
          <Accessibility
            size={18}
            className="text-text-inverse"
            aria-hidden="true"
          />
        </span>
        <span className="font-display text-[15px] font-bold text-text-primary">
          A11y Reader
        </span>
      </button>

      {NAV_ITEMS.map(({ view: itemView, icon }) => (
        <NavItem
          key={itemView}
          icon={icon}
          label={VIEW_NAV_LABELS[itemView]}
          active={view === itemView}
          onClick={() => setView(itemView)}
        />
      ))}
    </nav>
  );
}
