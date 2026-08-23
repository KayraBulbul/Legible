import { useCallback, useState } from "react";
import type { ReaderSettings, SavedPage } from "@/types";

/**
 * Reader controls for one page, seeded from what was saved with it.
 *
 * Mirrors `accessibilitySettings` in docs/api.md so the reader can be pointed
 * at a real profile without renaming anything. Local-only for now: the reader
 * is mounted with `key={page.id}`, so switching pages remounts it and the
 * settings re-seed rather than leaking across pages.
 *
 * TODO(backend): PATCH /api/v1/saved-pages/{id} (or the active profile) when
 * settings become persistable.
 */
export function useReaderSettings(page: SavedPage) {
  const [settings, setSettings] = useState<ReaderSettings>({
    dyslexiaFont: page.dyslexiaFont,
    contrastMode: page.contrastMode,
    fontScale: 100,
    bionicReading: false,
    letterSpacing: 0,
    lineHeight: 1.8,
  });

  const update = useCallback(
    <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) =>
      setSettings((current) => ({ ...current, [key]: value })),
    [],
  );

  return { settings, update };
}
