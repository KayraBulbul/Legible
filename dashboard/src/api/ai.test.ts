import { describe, expect, it, vi } from "vitest";

const API_BASE_URL = "https://api.example.test";

describe("transformContent", () => {
  it("preserves the complete transformation document and provenance", async () => {
    vi.stubEnv("VITE_API_BASE_URL", API_BASE_URL);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: {
            format: "semantic_html",
            html: "<article><p>Clear text.</p></article>",
            text: "Clear text.",
            language: "en",
          },
          metadata: {
            operation: "simplify",
            provider: "google",
            model: "gemini-3.6-flash",
            promptVersion: "simplify-v1",
            parameters: {
              simplificationLevel: "strong",
              preserveTechnicalTerms: false,
            },
            performedAt: "2026-08-24T02:00:00Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { setAccessToken } = await import("@/api/client");
    setAccessToken("paired-token");
    const { transformContent } = await import("@/api/ai");
    const controller = new AbortController();

    const result = await transformContent(
      "simplify",
      {
        format: "semantic_html",
        html: "<article><p>Dense text.</p></article>",
        text: "Dense text.",
        language: "en",
      },
      { simplificationLevel: "strong", preserveTechnicalTerms: false },
      controller.signal,
    );

    expect(result).toEqual({
      document: {
        format: "semantic_html",
        html: "<article><p>Clear text.</p></article>",
        text: "Clear text.",
        language: "en",
      },
      metadata: {
        operation: "simplify",
        provider: "google",
        model: "gemini-3.6-flash",
        promptVersion: "simplify-v1",
        parameters: {
          simplificationLevel: "strong",
          preserveTechnicalTerms: false,
        },
        performedAt: "2026-08-24T02:00:00Z",
      },
    });

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_BASE_URL}/api/v1/transformations`);
    expect(request.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer paired-token",
    });
    expect(request.signal).toBe(controller.signal);
    expect(JSON.parse(request.body as string)).toEqual({
      operation: "simplify",
      input: {
        format: "semantic_html",
        html: "<article><p>Dense text.</p></article>",
        text: "Dense text.",
        language: "en",
      },
      options: {
        simplificationLevel: "strong",
        preserveTechnicalTerms: false,
      },
    });
  });
});
