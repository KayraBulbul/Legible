import type { SavedPage } from "@/types";
import PageRow from "@/components/PageRow";

const COLUMNS = ["Name", "Reading modes", "Saved"];

export default function PageTable({ pages }: { pages: SavedPage[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-secondary">
            {COLUMNS.map((column) => (
              <th key={column} scope="col" className="px-2 py-2 font-medium first:pl-4">
                {column}
              </th>
            ))}
            <th scope="col" className="w-10 px-4 py-2">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <PageRow key={page.id} page={page} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
