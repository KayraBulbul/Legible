import { describe, expect, it, vi } from "vitest";

describe("getPageContent", () => {
  it("returns saved content with the complete accessibility snapshot", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    const detail = {
      sourceDocument: {
        format: "semantic_html",
        html: "<article><p>Source</p></article>",
        text: "Source",
        language: "en",
      },
      transformedDocument: {
        format: "semantic_html",
        html: "<article><p>Transformed</p></article>",
        text: "Transformed",
        language: "en",
      },
      accessibilitySettings: {
        schemaVersion: 1,
        dyslexiaFont: "lexend",
        contrastMode: "dark",
        declutter: true,
        bionicReading: true,
        fontScale: 130,
        lineHeight: 2,
        letterSpacing: 0.05,
        wordSpacing: 0.1,
        reducedMotion: true,
        readingWidth: 68,
        ttsRate: 1.2,
        ttsPitch: 0.8,
        voiceURI: "saved-voice",
        hudVisible: false,
        aiEnabled: true,
        aiPreferences: {
          simplificationLevel: "strong",
          preserveTechnicalTerms: false,
        },
      },
    } as const;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(detail), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getPageContent } = await import("@/api/pages");
    const content = await getPageContent("saved-page-id");

    expect(content).toEqual(detail);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/saved-pages/saved-page-id",
      expect.objectContaining({ method: "GET", credentials: "omit" }),
    );
  });
});
