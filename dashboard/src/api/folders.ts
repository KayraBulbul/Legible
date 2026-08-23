import type { PageFolder } from "@/types";
import { MOCK_FOLDERS } from "@/data/mockFolders";
import { USE_MOCK_API, apiRequest } from "@/api/client";
import { mockDelay, mockId } from "@/api/mock";

/* ============================================================================
 * FOLDER REPOSITORY
 * ----------------------------------------------------------------------------
 * Folders are a dashboard concept with no endpoints in docs/api.md yet. They
 * are shaped like every other repository here so that adding them to the
 * contract is a change to these two functions and nothing else.
 * ==========================================================================*/

let mockFolders: PageFolder[] | null = null;

function mockStore(): PageFolder[] {
  mockFolders ??= MOCK_FOLDERS.map((folder) => ({ ...folder }));
  return mockFolders;
}

export async function listFolders(signal?: AbortSignal): Promise<PageFolder[]> {
  if (USE_MOCK_API) return mockDelay(mockStore().map((folder) => ({ ...folder })));

  // TODO(backend): GET /api/v1/folders once the endpoint exists.
  return apiRequest<PageFolder[]>("/folders", { signal });
}

/**
 * Ids come back from the store, never from the caller — the server owns them,
 * and the mock branch imitates that so the UI can't grow a dependency on
 * client-generated ids.
 */
export async function createFolder(name: string): Promise<PageFolder> {
  const trimmed = name.trim();

  if (USE_MOCK_API) {
    const folder: PageFolder = { id: mockId("f"), name: trimmed };
    mockStore().push(folder);
    return mockDelay({ ...folder });
  }

  // TODO(backend): POST /api/v1/folders once the endpoint exists.
  return apiRequest<PageFolder>("/folders", {
    method: "POST",
    body: { name: trimmed },
  });
}
