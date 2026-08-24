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

describe("savePageTransformation", () => {
  it("stores transformed content with its provenance", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { setAccessToken } = await import("@/api/client");
    setAccessToken("paired-token");
    const { savePageTransformation } = await import("@/api/pages");
    const controller = new AbortController();

    await savePageTransformation(
      "saved-page-id",
      {
        format: "semantic_html",
        html: "<article><p>Restructured</p></article>",
        text: "Restructured",
        language: "en",
      },
      {
        operation: "restructure",
        provider: "google",
        model: "gemini-3.6-flash",
        promptVersion: "restructure-v1",
        parameters: {
          simplificationLevel: "moderate",
          preserveTechnicalTerms: true,
        },
        performedAt: "2026-08-24T07:30:00Z",
      },
      controller.signal,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/saved-pages/saved-page-id",
      {
        method: "PATCH",
        signal: controller.signal,
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer paired-token",
        },
        body: JSON.stringify({
          transformedDocument: {
            format: "semantic_html",
            html: "<article><p>Restructured</p></article>",
            text: "Restructured",
            language: "en",
          },
          transformations: [
            {
              operation: "restructure",
              provider: "google",
              model: "gemini-3.6-flash",
              promptVersion: "restructure-v1",
              parameters: {
                simplificationLevel: "moderate",
                preserveTechnicalTerms: true,
              },
              performedAt: "2026-08-24T07:30:00Z",
            },
          ],
        }),
      },
    );
  });
});
