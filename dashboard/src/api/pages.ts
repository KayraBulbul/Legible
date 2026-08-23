import type { SavedPage, SavedPagePatch } from "@/types";
import { MOCK_PAGES } from "@/data/mockPages";
import { USE_MOCK_API, apiRequest } from "@/api/client";
import { mockDelay } from "@/api/mock";

/* ============================================================================
 * SAVED-PAGE REPOSITORY
 * ----------------------------------------------------------------------------
 * The only module that knows saved pages can come from anywhere but memory.
 * Callers get domain `SavedPage` objects and never see wire shapes, so the
 * mock branches below are the whole of what the backend swap has to replace.
 * ==========================================================================*/

/* ------------------------------------------------------------- wire mapping */

/** `GET /api/v1/saved-pages` list item — see docs/api.md. */
interface SavedPageListItemDto {
  id: string;
  originalUrl: string;
  title: string;
  capturedAt: string;
}

interface PaginatedDto<T> {
  items: T[];
  pagination: { limit: number; offset: number; total: number };
}

function domainOf(originalUrl: string): string {
  try {
    return new URL(originalUrl).hostname.replace(/^www\./, "");
  } catch {
    return originalUrl;
  }
}

/**
 * List responses carry no accessibility settings and no folder/favorite/trash
 * state — the first is only on the full page response, the rest are dashboard
 * concepts the contract does not model yet (docs/api.md, "Decisions still
 * open"). They default here so one mapper stays the single source of truth.
 */
function toSavedPage(dto: SavedPageListItemDto): SavedPage {
  return {
    id: dto.id,
    title: dto.title,
    domain: domainOf(dto.originalUrl),
    savedAt: dto.capturedAt,
    folderId: null,
    favorited: false,
    trashed: false,
    dyslexiaFont: "none",
    contrastMode: "none",
    aiLabels: 0,
  };
}

/* ---------------------------------------------------------------- mock store */

/** Copied on first use so mutations are visible across reads, like a server. */
let mockPages: SavedPage[] | null = null;

function mockStore(): SavedPage[] {
  mockPages ??= MOCK_PAGES.map((page) => ({ ...page }));
  return mockPages;
}

function mockPageOrThrow(id: string): SavedPage {
  const page = mockStore().find((p) => p.id === id);
  if (!page) throw new Error(`No saved page with id ${id}`);
  return page;
}

/* ------------------------------------------------------------------ requests */

export async function listPages(signal?: AbortSignal): Promise<SavedPage[]> {
  if (USE_MOCK_API) return mockDelay(mockStore().map((page) => ({ ...page })));

  const response = await apiRequest<PaginatedDto<SavedPageListItemDto>>(
    "/saved-pages",
    { signal, query: { limit: 100 } },
  );
  return response.items.map(toSavedPage);
}

/**
 * Persists an edit. Callers apply the change optimistically, so this only has
 * to report success or failure.
 *
 * NOTE: the contract's `PATCH /saved-pages/{id}` accepts `title` only today.
 * Folder, favorite and trash state stay client-side until it grows fields for
 * them; this is the one function that changes when it does.
 */
export async function updatePage(
  id: string,
  patch: SavedPagePatch,
): Promise<SavedPage> {
  if (USE_MOCK_API) {
    const page = mockPageOrThrow(id);
    Object.assign(page, patch);
    return mockDelay({ ...page });
  }

  const dto = await apiRequest<SavedPageListItemDto>(`/saved-pages/${id}`, {
    method: "PATCH",
    body: { title: patch.title },
  });
  return toSavedPage(dto);
}

export async function deletePage(id: string): Promise<void> {
  if (USE_MOCK_API) {
    mockPages = mockStore().filter((page) => page.id !== id);
    await mockDelay(undefined);
    return;
  }

  await apiRequest<void>(`/saved-pages/${id}`, { method: "DELETE" });
}
