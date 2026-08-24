import { useCallback, useEffect, useRef, useState } from "react";
import type { ReaderSettings, SavedAccessibilitySettings, SavedPage } from "@/types";
import { useTheme } from "@/context/themeContext";

/**
 * Reader controls for one page. `accessibilitySettings` only arrives once
 * `GET /saved-pages/{id}` resolves (docs/api.md), so this seeds a sane
 * default up front — so ReaderControls has something to render immediately —
 * then hydrates from `apiSettings` the moment it loads. Local-only from
 * there: the reader is mounted with `key={page.id}`, so switching pages
 * remounts it and the settings re-seed rather than leaking across pages.
 *
 * TODO(backend): PATCH /api/v1/saved-pages/{id} (or the active profile) when
 * settings become persistable.
 */
export function useReaderSettings(
  page: SavedPage,
  apiSettings: SavedAccessibilitySettings | null,
) {
  const { theme } = useTheme();
  const [settings, setSettings] = useState<ReaderSettings>({
    dyslexiaFont: page.dyslexiaFont,
    contrastMode: theme,
    declutter: false,
    fontScale: 100,
    bionicReading: false,
    letterSpacing: 0,
    wordSpacing: 0,
    lineHeight: 1.8,
    reducedMotion: false,
    readingWidth: null,
  });

  // Applies the loaded settings exactly once — later re-renders (e.g. the
  // user toggling something) must not get clobbered by a stale effect re-run.
  const hydrated = useRef(false);
  useEffect(() => {
    if (!apiSettings || hydrated.current) return;
    hydrated.current = true;
    setSettings((current) => ({
      ...current,
      dyslexiaFont: apiSettings.dyslexiaFont,
      contrastMode:
        apiSettings.contrastMode === "none"
          ? current.contrastMode
          : apiSettings.contrastMode,
      declutter: apiSettings.declutter,
      fontScale: apiSettings.fontScale,
      bionicReading: apiSettings.bionicReading,
      letterSpacing: apiSettings.letterSpacing ?? current.letterSpacing,
      wordSpacing: apiSettings.wordSpacing ?? current.wordSpacing,
      lineHeight: apiSettings.lineHeight ?? current.lineHeight,
      reducedMotion: apiSettings.reducedMotion,
      readingWidth: apiSettings.readingWidth,
    }));
  }, [apiSettings]);

  const update = useCallback(
    <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) =>
      setSettings((current) => ({ ...current, [key]: value })),
    [],
  );

  return { settings, update };
}
