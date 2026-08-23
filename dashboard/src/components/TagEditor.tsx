import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { canAddTag, MAX_TAGS, MAX_TAG_LENGTH, normalizeTag } from "@/utils/tags";

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

/**
 * Chip input for a page's tags. Owns only the half-typed draft; the tag set
 * itself is the caller's, so every add or remove here calls back with the
 * full next array rather than mutating anything locally.
 */
export default function TagEditor({ tags, onChange }: TagEditorProps) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    if (canAddTag(tags, draft)) onChange([...tags, normalizeTag(draft)]);
    setDraft("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((existing) => existing !== tag));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitDraft();
    } else if (event.key === "Backspace" && draft === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  const atLimit = tags.length >= MAX_TAGS;

  return (
    <div className="flex flex-col gap-1.5">
      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li key={tag}>
              <span className="flex items-center gap-1 rounded-full bg-accent-subtle px-2 py-0.5 text-[11px] font-medium text-accent">
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove tag ${tag}`}
                  className="rounded-full p-0.5 hover:bg-accent/20"
                >
                  <X size={10} aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {!atLimit && (
        <div className="flex items-center gap-1">
          <label htmlFor="tag-editor-input" className="sr-only">
            Add a tag
          </label>
          <input
            id="tag-editor-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitDraft}
            maxLength={MAX_TAG_LENGTH}
            placeholder="Add a tag"
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent-subtle"
          />
          <button
            onClick={commitDraft}
            disabled={!canAddTag(tags, draft)}
            aria-label="Add tag"
            className="shrink-0 rounded-lg border border-border p-1 text-text-secondary hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={13} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
