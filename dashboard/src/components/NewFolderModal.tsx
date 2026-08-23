import { useState, type FormEvent } from "react";
import Modal from "@/components/Modal";
import { useLibrary } from "@/context/libraryContext";
import { useWorkspace } from "@/context/workspaceContext";

/**
 * The folder name lives here rather than in a context: nothing outside this
 * dialog has any use for a half-typed name, and keeping it local means typing
 * in it doesn't re-render the rest of the dashboard.
 */
export default function NewFolderModal() {
  const { createFolder } = useLibrary();
  const { closeNewFolder } = useWorkspace();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!trimmed || pending) return;

    setPending(true);
    setError(null);
    try {
      await createFolder(trimmed);
      closeNewFolder();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <Modal onClose={closeNewFolder} title="New folder">
      {/* A form, so Enter submits and the browser handles the semantics. */}
      <form onSubmit={handleSubmit}>
        <label
          htmlFor="new-folder-name"
          className="mb-1 block text-xs font-medium text-text-secondary"
        >
          Folder name
        </label>
        <input
          id="new-folder-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Reading list"
          disabled={pending}
          aria-describedby={error ? "new-folder-error" : undefined}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent-subtle disabled:opacity-60"
        />

        {error && (
          <p id="new-folder-error" role="alert" className="mt-2 text-xs text-danger">
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={closeNewFolder}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!trimmed || pending}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-text-inverse hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
