/**
 * Decorative, theme-invariant swatch classes (tokens live in src/index.css).
 * Chosen for hue + lightness separation so they stay distinguishable under
 * common colour-vision deficiencies, and constant across light/dark so a
 * page keeps its identity when the theme flips.
 *
 * Always paired with literal white foregrounds — the swatches are dark enough
 * for white overlays in either theme, which theme tokens could not guarantee.
 */
const SWATCH_CLASSES = [
  "bg-swatch-1",
  "bg-swatch-2",
  "bg-swatch-3",
  "bg-swatch-4",
  "bg-swatch-5",
  "bg-swatch-6",
] as const;

/** FNV-1a — small, stable, and dependency-free. */
function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Picks a swatch from an entity id. Derived rather than stored so a page keeps
 * the same colour no matter how the list is sorted or filtered, and so the
 * backend never has to persist presentation data.
 */
export function swatchForId(id: string): string {
  return SWATCH_CLASSES[hash(id) % SWATCH_CLASSES.length];
}
