import type { PageFolder } from "@/types";
import { MOCK_FOLDERS } from "@/data/mockFolders";

// TODO(backend): swap for `fetch("/api/folders")` once the endpoint exists.
export async function fetchFolders(): Promise<PageFolder[]> {
  return MOCK_FOLDERS;
}
