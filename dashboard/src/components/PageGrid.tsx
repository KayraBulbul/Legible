import type { SavedPage } from "@/types";
import PageCard from "@/components/PageCard";

export default function PageGrid({ pages }: { pages: SavedPage[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {pages.map((page) => (
        <li key={page.id}>
          <PageCard page={page} />
        </li>
      ))}
    </ul>
  );
}
