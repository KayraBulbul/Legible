import { describe, expect, it, vi } from "vitest";

describe("apiRequest", () => {
  it("returns the backend error envelope as an ApiError", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "validation_error",
              message: "The request is invalid.",
              fields: [
                {
                  path: "transformedDocument",
                  message: "Field required with transformations.",
                },
              ],
            },
          }),
          { status: 422, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const { ApiError, apiRequest } = await import("@/api/client");

    await expect(apiRequest("/saved-pages/page-id")).rejects.toEqual(
      new ApiError(422, "validation_error", "The request is invalid.", [
        {
          path: "transformedDocument",
          message: "Field required with transformations.",
        },
      ]),
    );
  });
});
