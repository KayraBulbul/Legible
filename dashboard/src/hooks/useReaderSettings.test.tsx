import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeContext } from "@/context/themeContext";
import { useReaderSettings } from "@/hooks/useReaderSettings";
import type { SavedAccessibilitySettings, SavedPage } from "@/types";

const PAGE: SavedPage = {
  id: "page-id",
  title: "Saved article",
  domain: "example.test",
  originalUrl: "https://example.test/article",
  savedAt: "2026-08-24T01:00:00Z",
  favorited: false,
  trashed: false,
  tags: [],
  dyslexiaFont: "none",
  contrastMode: "light",
  aiLabels: 0,
};

const SAVED_SETTINGS: SavedAccessibilitySettings = {
  schemaVersion: 1,
  dyslexiaFont: "opendyslexic",
  contrastMode: "dark",
  declutter: true,
  bionicReading: true,
  fontScale: 140,
  lineHeight: 2.1,
  letterSpacing: 0.08,
  wordSpacing: 0.15,
  reducedMotion: true,
  readingWidth: 62,
  ttsRate: 1.3,
  ttsPitch: 0.9,
  voiceURI: "saved-voice",
  hudVisible: false,
  aiEnabled: true,
  aiPreferences: {
    simplificationLevel: "strong",
    preserveTechnicalTerms: false,
  },
};

function LightTheme({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: "light", setTheme: vi.fn() }}>
      {children}
    </ThemeContext.Provider>
  );
}

describe("useReaderSettings", () => {
  it("hydrates every visual reader setting from the saved snapshot", async () => {
    const { result } = renderHook(
      () => useReaderSettings(PAGE, SAVED_SETTINGS),
      { wrapper: LightTheme },
    );

    await waitFor(() => {
      expect(result.current.settings).toEqual({
        dyslexiaFont: "opendyslexic",
        contrastMode: "dark",
        declutter: true,
        fontScale: 140,
        bionicReading: true,
        letterSpacing: 0.08,
        wordSpacing: 0.15,
        lineHeight: 2.1,
        reducedMotion: true,
        readingWidth: 62,
      });
    });
  });

  it("keeps the dashboard theme when the saved page has no contrast override", async () => {
    const { result } = renderHook(
      () =>
        useReaderSettings(PAGE, {
          ...SAVED_SETTINGS,
          contrastMode: "none",
        }),
      { wrapper: LightTheme },
    );

    await waitFor(() => {
      expect(result.current.settings.contrastMode).toBe("light");
    });
  });
});
