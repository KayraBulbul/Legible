import type { ChangeEvent } from "react";
import { Search, LayoutGrid, List, Sun, Moon } from "lucide-react";
import cn from "@/utils/cn";
import { useDashboardContext } from "@/context/useDashboardContext";
import { useTheme } from "@/hooks/useTheme";
import type { SortBy } from "@/types";

export default function Topbar() {
  const { query, setQuery, viewMode, setViewMode, sortBy, setSortBy } =
    useDashboardContext();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface px-6 py-3.5">
      <div className="relative max-w-md flex-1">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <input
          value={query}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setQuery(e.target.value)
          }
          placeholder="Search saved pages"
          className="w-full rounded-full border border-border bg-surface-hover py-2 pl-9 pr-4 text-sm outline-none placeholder:text-text-secondary focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent-subtle"
        />
      </div>

      <div className="flex items-center rounded-full border border-border p-0.5">
        <button
          onClick={() => setViewMode("grid")}
          className={cn(
            "rounded-full p-1.5",
            viewMode === "grid"
              ? "bg-accent text-text-inverse"
              : "text-text-secondary",
          )}
        >
          <LayoutGrid size={15} />
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={cn(
            "rounded-full p-1.5",
            viewMode === "list"
              ? "bg-accent text-text-inverse"
              : "text-text-secondary",
          )}
        >
          <List size={15} />
        </button>
      </div>

      <select
        value={sortBy}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          setSortBy(e.target.value as SortBy)
        }
        className="rounded-full items-center text-center border border-border bg-surface p-2 text-xs font-medium text-text-secondary outline-none"
      >
        <option value="date">Date saved</option>
        <option value="title">Title A–Z</option>
      </select>

      <button
        onClick={toggleTheme}
        aria-label={
          theme === "light" ? "Switch to dark theme" : "Switch to light theme"
        }
        className="rounded-full border border-border p-2 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
      >
        {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
      </button>

      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning text-xs font-bold text-text-inverse ml-auto select-none">
        AA
      </div>
    </div>
  );
}
