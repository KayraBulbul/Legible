import NavItem from "@/components/NavItem";
import {
  Home,
  FileText,
  Folder,
  Star,
  Clock,
  Trash2,
  Plus,
  Accessibility,
} from "lucide-react";
import { useDashboardContext } from "@/context/useDashboardContext";

export default function Sidebar() {
  const { view, setView, folders, openNewFolder } = useDashboardContext();

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-1 border-r border-border bg-surface p-4">
      <button
        onClick={() => (window.location.href = "/")}
        className="mb-4 flex items-center gap-2 px-2"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-base">
          <Accessibility size={18} className="text-text-inverse" />
        </div>
        <span
          className="text-[15px] font-bold text-text-primary"
          style={{ fontFamily: "'Lexend', sans-serif" }}
        >
          A11y Reader
        </span>
      </button>

      <button
        onClick={openNewFolder}
        className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-accent px-3 py-3 text-sm font-semibold text-text-inverse shadow-sm hover:bg-accent-hover"
      >
        <Plus size={16} /> New folder
      </button>

      <NavItem
        icon={Home}
        label="Home"
        active={view === "home"}
        onClick={() => setView("home")}
      />
      <NavItem
        icon={FileText}
        label="My pages"
        active={view === "mypages"}
        onClick={() => setView("mypages")}
      />
      <NavItem
        icon={Clock}
        label="Recent"
        active={view === "recent"}
        onClick={() => setView("recent")}
      />
      <NavItem
        icon={Star}
        label="Favorites"
        active={view === "favorited"}
        onClick={() => setView("favorited")}
      />
      <NavItem
        icon={Trash2}
        label="Trash"
        active={view === "trash"}
        onClick={() => setView("trash")}
      />

      <div className="mt-5 mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        Folders
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto">
        {folders.map((f) => (
          <NavItem
            key={f.id}
            icon={Folder}
            label={f.name}
            active={view === `folder:${f.id}`}
            onClick={() => setView(`folder:${f.id}`)}
          />
        ))}
      </div>

      <div className="mt-auto rounded-xl bg-surface-hover p-3 text-[11px] text-text-secondary">
        {/* TODO(extension): reflect real connection state via chrome.runtime messaging */}
        <div className="flex items-center gap-1.5 font-medium text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" /> Extension
          connected
        </div>
        <p className="mt-1 leading-snug">
          Save a page from any site with the ♿ toolbar or Alt+R.
        </p>
      </div>
    </aside>
  );
}
