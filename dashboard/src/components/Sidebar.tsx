import {
  Accessibility,
  Clock,
  FileText,
  Folder,
  Home,
  Plus,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { StaticView } from "@/types";
import { VIEW_NAV_LABELS, folderView } from "@/navigation/views";
import NavItem from "@/components/NavItem";
import { useLibrary } from "@/context/libraryContext";
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
  const { folders } = useLibrary();
  const { view, setView, openNewFolder } = useWorkspace();

  return (
    <nav
      aria-label="Library"
      className="flex w-64 shrink-0 flex-col gap-1 border-r border-border bg-surface p-4"
    >
      <button
        onClick={() => setView("home")}
        className="mb-4 flex items-center gap-2 px-2"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
          <Accessibility size={18} className="text-text-inverse" aria-hidden="true" />
        </span>
        <span className="font-display text-[15px] font-bold text-text-primary">
          A11y Reader
        </span>
      </button>

      <button
        onClick={openNewFolder}
        className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-accent px-3 py-3 text-sm font-semibold text-text-inverse shadow-sm hover:bg-accent-hover"
      >
        <Plus size={16} aria-hidden="true" /> New folder
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

      <h2 className="mt-5 mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        Folders
      </h2>
      <div className="flex flex-col gap-1 overflow-y-auto">
        {folders.map((folder) => (
          <NavItem
            key={folder.id}
            icon={Folder}
            label={folder.name}
            active={view === folderView(folder.id)}
            onClick={() => setView(folderView(folder.id))}
          />
        ))}
      </div>
    </nav>
  );
}
