import type { SavedPage } from "@/types";

interface CountOptions {
  starred?: boolean;
  trash?: boolean;
  folder?: boolean;
}

export default function countPages<T extends CountOptions>(
  pages: SavedPage[],
  folderId: string | null,
  options: T,
): Partial<Record<keyof CountOptions, number>> {
  const result: Partial<Record<keyof CountOptions, number>> = {};

  if (options.folder) {
    result.folder = pages.filter(
      (p) => p.folderId === folderId && !p.trashed,
    ).length;
  }

  if (options.starred) {
    result.starred = pages.filter((p) => p.starred && !p.trashed).length;
  }

  if (options.trash) {
    result.trash = pages.filter((p) => p.trashed).length;
  }

  return result;
}
