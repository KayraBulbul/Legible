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
  isFavourited: boolean;
  tags: string[];
}

/** Body accepted by `PATCH /saved-pages/{id}` — see docs/api.md. */
interface SavedPagePatchDto {
  title?: string;
  isFavourited?: boolean;
  tags?: string[];
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
 * List and patch responses carry no accessibility settings — those live only
 * on the full page response — and no trash state, which the contract does
 * not model at all (docs/api.md, "Decisions still open"). Both default here
 * so one mapper stays the single source of truth.
 */
function toSavedPage(dto: SavedPageListItemDto): SavedPage {
  return {
    id: dto.id,
    title: dto.title,
    domain: domainOf(dto.originalUrl),
    savedAt: dto.capturedAt,
    favorited: dto.isFavourited,
    trashed: false,
    tags: dto.tags,
    dyslexiaFont: "none",
    contrastMode: "none",
    aiLabels: 0,
  };
}

/** Only the fields a caller actually supplied round-trip to the wire. */
function toPatchDto(patch: SavedPagePatch): SavedPagePatchDto {
  const dto: SavedPagePatchDto = {};
  if (patch.title !== undefined) dto.title = patch.title;
  if (patch.favorited !== undefined) dto.isFavourited = patch.favorited;
  if (patch.tags !== undefined) dto.tags = patch.tags;
  return dto;
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
 * NOTE: `PATCH /saved-pages/{id}` accepts `title`, `isFavourited` and `tags`
 * (docs/api.md); trash state stays client-side since the contract deletes
 * outright rather than modelling a trash state.
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
    body: toPatchDto(patch),
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
