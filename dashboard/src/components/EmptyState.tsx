import { FileText } from "lucide-react";
import type { StaticView, View } from "@/types";

interface Copy {
  title: string;
  body: string;
}

const COPY_BY_VIEW: Partial<Record<StaticView, Copy>> = {
  trash: {
    title: "Trash is empty",
    body: "Pages you delete will show up here for 30 days before they’re gone for good.",
  },
  favorited: {
    title: "No favorite pages yet",
    body: "Star a saved page to pin it here for quick access.",
  },
  recent: {
    title: "Nothing saved recently",
    body: "Pages you save from the extension will appear here first.",
  },
};

/** Search misses fall through to the generic copy. */
const FALLBACK: Copy = {
  title: "No pages here yet",
  body: "Save a page from the extension to see it here.",
};

export default function EmptyState({ view }: { view: View }) {
  const copy = COPY_BY_VIEW[view as StaticView] ?? FALLBACK;

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface py-16 text-center">
      <div
        aria-hidden="true"
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-hover text-text-secondary"
      >
        <FileText size={20} />
      </div>
      <p className="text-sm font-semibold text-text-primary">{copy.title}</p>
      <p className="mt-1 max-w-xs text-xs text-text-secondary">{copy.body}</p>
    </div>
  );
}
