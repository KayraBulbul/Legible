/* ============================================================================
 * TAG RULES
 * ----------------------------------------------------------------------------
 * Mirrors the backend's normalisation for `PATCH /saved-pages/{id}` tags
 * (docs/api.md), so an editor can reject a bad entry immediately instead of
 * letting it round-trip just to bounce with a 422.
 * ==========================================================================*/

export const MAX_TAGS = 20;
export const MAX_TAG_LENGTH = 50;

/** Trims, lower-cases, and collapses internal whitespace to single spaces. */
export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Whether `raw` could be added to `tags` as a new, distinct entry. */
export function canAddTag(tags: string[], raw: string): boolean {
  const normalized = normalizeTag(raw);
  return (
    normalized.length > 0 &&
    normalized.length <= MAX_TAG_LENGTH &&
    tags.length < MAX_TAGS &&
    !tags.includes(normalized)
  );
}
