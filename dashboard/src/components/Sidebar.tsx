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
  const { view, setView, folders, counts, openNewFolder } =
    useDashboardContext();

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-1 bg-stone-950 p-4">
      <button
        onClick={() => (window.location.href = "/")}
        className="mb-4 flex items-center gap-2 px-2"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 text-base">
          <Accessibility size={18} className="text-white" />
        </div>
        <span
          className="text-[15px] font-bold text-white"
          style={{ fontFamily: "'Lexend', sans-serif" }}
        >
          A11y Reader
        </span>
      </button>

      <button
        onClick={openNewFolder}
        className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-500"
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
        label="Starred"
        active={view === "starred"}
        onClick={() => setView("starred")}
        count={counts.starred}
      />
      <NavItem
        icon={Trash2}
        label="Trash"
        active={view === "trash"}
        onClick={() => setView("trash")}
        count={counts.trash}
      />

      <div className="mt-5 mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
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
            count={counts.folders[f.id] ?? 0}
          />
        ))}
      </div>

      <div className="mt-auto rounded-xl bg-stone-900 p-3 text-[11px] text-stone-400">
        {/* TODO(extension): reflect real connection state via chrome.runtime messaging */}
        <div className="flex items-center gap-1.5 font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Extension
          connected
        </div>
        <p className="mt-1 leading-snug">
          Save a page from any site with the ♿ toolbar or Alt+R.
        </p>
      </div>
    </aside>
  );
}
