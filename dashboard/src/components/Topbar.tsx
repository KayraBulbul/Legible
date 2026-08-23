import { LayoutGrid, List, Moon, Search, Sun } from "lucide-react";
import type { SortBy } from "@/types";
import cn from "@/utils/cn";
import { useTheme } from "@/context/themeContext";
import { useWorkspace } from "@/context/workspaceContext";

export default function Topbar() {
  const { query, setQuery, viewMode, setViewMode, sortBy, setSortBy } =
    useWorkspace();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface px-6 py-3.5">
      <div className="relative max-w-md flex-1">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search saved pages"
          aria-label="Search saved pages by title or site"
          className="w-full rounded-full border border-border bg-surface-hover py-2 pl-9 pr-4 text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent-subtle"
        />
      </div>

      {/* Two states of one setting, so radio semantics rather than buttons. */}
      <div
        role="radiogroup"
        aria-label="Layout"
        className="flex items-center rounded-full border border-border p-0.5"
      >
        {(
          [
            { mode: "grid", icon: LayoutGrid, label: "Grid" },
            { mode: "list", icon: List, label: "List" },
          ] as const
        ).map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            role="radio"
            aria-checked={viewMode === mode}
            aria-label={`${label} layout`}
            onClick={() => setViewMode(mode)}
            className={cn(
              "rounded-full p-1.5",
              viewMode === mode
                ? "bg-accent text-text-inverse"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            <Icon size={15} aria-hidden="true" />
          </button>
        ))}
      </div>

      <select
        value={sortBy}
        onChange={(event) => setSortBy(event.target.value as SortBy)}
        aria-label="Sort pages by"
        className="rounded-full border border-border bg-surface p-2 text-center text-xs font-medium text-text-secondary outline-none"
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
        {theme === "light" ? (
          <Moon size={15} aria-hidden="true" />
        ) : (
          <Sun size={15} aria-hidden="true" />
        )}
      </button>

      {/* TODO(backend): the guest user's initials once GET /api/v1/auth/me is
          wired up. Decorative until then, so hidden from assistive tech. */}
      <div
        aria-hidden="true"
        className="ml-auto flex h-8 w-8 select-none items-center justify-center rounded-full bg-warning text-xs font-bold text-text-inverse"
      >
        AA
      </div>
    </div>
  );
}
