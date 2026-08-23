import type { ChangeEvent } from "react";
import { Search, LayoutGrid, List } from "lucide-react";
import cn from "@/utils/cn";
import { useDashboardContext } from "@/context/useDashboardContext";
import type { SortBy } from "@/types";

export default function Topbar() {
  const { query, setQuery, viewMode, setViewMode, sortBy, setSortBy } =
    useDashboardContext();

  return (
    <div className="flex items-center gap-3 border-b border-stone-200 bg-white px-6 py-3.5">
      <div className="relative max-w-md flex-1">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
        />
        <input
          value={query}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          placeholder="Search saved pages"
          className="w-full rounded-full border border-stone-200 bg-stone-50 py-2 pl-9 pr-4 text-sm outline-none placeholder:text-stone-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
        />
      </div>

      <div className="flex items-center rounded-full border border-stone-200 p-0.5">
        <button
          onClick={() => setViewMode("grid")}
          className={cn(
            "rounded-full p-1.5",
            viewMode === "grid" ? "bg-stone-900 text-white" : "text-stone-500",
          )}
        >
          <LayoutGrid size={15} />
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={cn(
            "rounded-full p-1.5",
            viewMode === "list" ? "bg-stone-900 text-white" : "text-stone-500",
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
        className="rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-600 outline-none"
      >
        <option value="date">Date saved</option>
        <option value="title">Title A–Z</option>
      </select>

      <div className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-bold text-white">
        AA
      </div>
    </div>
  );
}
