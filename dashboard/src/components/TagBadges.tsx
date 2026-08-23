import { Tag } from "lucide-react";
import Badge from "@/components/Badge";

/** Keeps a card's badge row to one line even on a heavily-tagged page. */
const VISIBLE_LIMIT = 3;

/** Read-only tag chips for a saved page — the grid/table counterpart of TagEditor. */
export default function TagBadges({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;

  const visible = tags.slice(0, VISIBLE_LIMIT);
  const hiddenCount = tags.length - visible.length;

  return (
    <>
      {visible.map((tag) => (
        <Badge key={tag}>
          <Tag size={11} aria-hidden="true" /> {tag}
        </Badge>
      ))}
      {hiddenCount > 0 && <Badge>+{hiddenCount}</Badge>}
    </>
  );
}
