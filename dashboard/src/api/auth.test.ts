import { describe, expect, it, vi } from "vitest";

const API_BASE_URL = "https://api.example.test";

describe("dashboard pairing", () => {
  it("normalizes the code and stores the issued session token", async () => {
    vi.stubEnv("VITE_API_BASE_URL", API_BASE_URL);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: "bc44fd6c-75dd-49e7-aec2-65b7335e53ee",
            kind: "guest",
            displayName: "Ada",
            createdAt: "2026-08-24T01:00:00Z",
          },
          session: {
            accessToken: "paired-token",
            expiresAt: "2026-09-24T01:00:00Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { redeemPairingCode } = await import("@/api/auth");
    const user = await redeemPairingCode("ab-cd 2345");
    const { getAccessToken } = await import("@/api/client");

    expect(user).toEqual({
      id: "bc44fd6c-75dd-49e7-aec2-65b7335e53ee",
      kind: "guest",
      displayName: "Ada",
      createdAt: "2026-08-24T01:00:00Z",
    });
    expect(getAccessToken()).toBe("paired-token");

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_BASE_URL}/api/v1/auth/pairing-codes/redeem`);
    expect(JSON.parse(request.body as string)).toEqual({ code: "ABCD2345" });
  });
});
