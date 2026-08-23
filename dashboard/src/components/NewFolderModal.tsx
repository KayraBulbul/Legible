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
        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewFolderName(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && createFolder()}
        placeholder="Folder name"
        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      />
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={closeNewFolder}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100"
        >
          Cancel
        </button>
        <button
          onClick={createFolder}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          Create
        </button>
      </div>
    </Modal>
  );
}
