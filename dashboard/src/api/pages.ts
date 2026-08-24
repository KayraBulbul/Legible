import type {
  SavedAccessibilitySettings,
  SavedPage,
  SavedPageContent,
  SavedPagePatch,
} from "@/types";
import { MOCK_PAGES } from "@/data/mockPages";
import { SAMPLE_ARTICLE } from "@/data/sampleContent";
import { USE_MOCK_API, apiBlobRequest, apiRequest } from "@/api/client";
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

interface SemanticDocumentDto {
  format: "semantic_html";
  html: string;
  text: string;
  language: string | null;
}

/** `GET /saved-pages/{id}` full response — see docs/api.md. Only the content fields the reader needs. */
interface SavedPageDetailDto {
  sourceDocument: SemanticDocumentDto;
  transformedDocument: SemanticDocumentDto | null;
  accessibilitySettings: SavedAccessibilitySettings;
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
    originalUrl: dto.originalUrl,
    savedAt: dto.capturedAt,
    favorited: dto.isFavourited,
    trashed: false,
    tags: dto.tags,
    dyslexiaFont: "none",
    contrastMode: "light",
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

/** Fixture content for the mock branch of {@link getPageContent} — no real per-page body exists in mock mode. */
function mockContentFor(page: SavedPage): SavedPageContent {
  return {
    sourceDocument: {
      format: "semantic_html",
      html: `<article><h1>${page.title}</h1><p>${SAMPLE_ARTICLE}</p></article>`,
      text: `${page.title}\n\n${SAMPLE_ARTICLE}`,
      language: "en",
    },
    transformedDocument: null,
    accessibilitySettings: {
      schemaVersion: 1,
      dyslexiaFont: page.dyslexiaFont,
      contrastMode: page.contrastMode === "dark" ? "dark" : "light",
      declutter: false,
      bionicReading: false,
      fontScale: 100,
      lineHeight: 1.8,
      letterSpacing: 0,
      wordSpacing: 0,
      reducedMotion: false,
      readingWidth: null,
      ttsRate: 1,
      ttsPitch: 1,
      voiceURI: null,
      hudVisible: true,
      aiEnabled: true,
      aiPreferences: {
        simplificationLevel: "moderate",
        preserveTechnicalTerms: true,
      },
    },
  };
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
 * Fetches one saved page's article body. List items never carry
 * `sourceDocument` / `transformedDocument` (docs/api.md) — only
 * `GET /saved-pages/{id}` does — so the reader loads this separately from
 * whatever list item opened it.
 */
export async function getPageContent(
  id: string,
  signal?: AbortSignal,
): Promise<SavedPageContent> {
  if (USE_MOCK_API) return mockDelay(mockContentFor(mockPageOrThrow(id)));

  const dto = await apiRequest<SavedPageDetailDto>(`/saved-pages/${id}`, {
    signal,
  });
  return {
    sourceDocument: dto.sourceDocument,
    transformedDocument: dto.transformedDocument,
    accessibilitySettings: dto.accessibilitySettings,
  };
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

/* --------------------------------------------------------------- PDF export */

/** `content` query on `GET /saved-pages/{id}/export.pdf` — see docs/api.md. */
export type PdfContentMode = "preferred" | "source" | "transformed";

export interface ExportedPdf {
  blob: Blob;
  filename: string;
}

function slugify(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "saved-page";
}

/**
 * A minimal, byte-offset-correct one-page PDF so the export button has
 * something real to download in mock mode, without pulling in a PDF library
 * for a fixture. The real backend renders the saved document (docs/api.md).
 */
function buildMockPdf(title: string): Blob {
  const safeTitle = title.replace(/[()\\]/g, "\\$&").slice(0, 70);
  const contentStream = `BT /F1 16 Tf 72 720 Td (Mock export: ${safeTitle}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const [index, body] of objects.entries()) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

/**
 * Downloads a saved page as a PDF via `GET /saved-pages/{id}/export.pdf`
 * (docs/api.md). Returns the blob and a filename derived from the response's
 * `Content-Disposition`, falling back to the saved title.
 */
export async function exportSavedPagePdf(
  id: string,
  content: PdfContentMode = "preferred",
): Promise<ExportedPdf> {
  if (USE_MOCK_API) {
    const page = mockPageOrThrow(id);
    const blob = await mockDelay(buildMockPdf(page.title));
    return { blob, filename: `${slugify(page.title)}.pdf` };
  }

  const { blob, filename } = await apiBlobRequest(
    `/saved-pages/${id}/export.pdf`,
    {
      query: { content },
    },
  );
  return { blob, filename: filename ?? "saved-page.pdf" };
}
