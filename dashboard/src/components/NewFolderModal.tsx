import type { ChangeEvent, KeyboardEvent } from "react";
import Modal from "@/components/Modal";
import { useDashboardContext } from "@/context/useDashboardContext";

export default function NewFolderModal() {
  const { newFolderName, setNewFolderName, closeNewFolder, createFolder } =
    useDashboardContext();

  return (
    <Modal onClose={closeNewFolder} title="New folder">
      <input
        autoFocus
        value={newFolderName}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setNewFolderName(e.target.value)
        }
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) =>
          e.key === "Enter" && createFolder()
        }
        placeholder="Folder name"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-text-primary text-sm outline-none focus:ring-2 focus:ring-accent-subtle focus:border-accent"
      />
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={closeNewFolder}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-surface-hover"
        >
          Cancel
        </button>
        <button
          onClick={createFolder}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-text-inverse hover:bg-accent-hover"
        >
          Create
        </button>
      </div>
    </Modal>
  );
}
