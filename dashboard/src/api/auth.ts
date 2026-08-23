import { USE_MOCK_API, apiRequest, setAccessToken } from "@/api/client";
import { mockDelay } from "@/api/mock";

/* ============================================================================
 * AUTH REPOSITORY
 * ----------------------------------------------------------------------------
 * The dashboard never creates its own guest session — it joins one that
 * already exists in the extension by redeeming a pairing code (docs/api.md,
 * "Pair extension and dashboard"). This is the only module that knows the
 * wire shape of that exchange.
 * ==========================================================================*/

/** `UserResponse` in docs/api.md. */
export interface AuthUser {
  id: string;
  kind: "guest";
  displayName: string | null;
  createdAt: string;
}

interface SessionDto {
  accessToken: string;
  expiresAt: string;
}

/** `GuestSessionResponse` in docs/api.md — returned by both guest creation and pairing redemption. */
interface IssuedSessionDto {
  user: AuthUser;
  session: SessionDto;
}

const MOCK_USER: AuthUser = {
  id: "mock-user",
  kind: "guest",
  displayName: null,
  createdAt: new Date(0).toISOString(),
};

/**
 * Redeems a one-time pairing code created on the paired extension, then
 * stores the returned token so subsequent requests are authenticated.
 * Throws {@link ApiError} `invalid_pairing_code` (400) or
 * `pairing_rate_limited` (429) on failure — see docs/api.md.
 */
export async function redeemPairingCode(code: string): Promise<AuthUser> {
  if (USE_MOCK_API) {
    setAccessToken("mock-token");
    return mockDelay(MOCK_USER);
  }

  const dto = await apiRequest<IssuedSessionDto>("/auth/pairing-codes/redeem", {
    method: "POST",
    body: { code },
  });
  setAccessToken(dto.session.accessToken);
  return dto.user;
}

/**
 * Validates whatever token is currently set (see `getAccessToken`) and
 * returns the user it belongs to. Rejects with an unauthorized
 * {@link ApiError} if the token is missing, expired, or revoked.
 */
export async function fetchCurrentUser(signal?: AbortSignal): Promise<AuthUser> {
  if (USE_MOCK_API) return mockDelay(MOCK_USER);

  return apiRequest<AuthUser>("/auth/me", { signal });
}

/** Revokes only the current session's token. Best-effort: callers clear local state regardless. */
export async function revokeCurrentSession(): Promise<void> {
  if (USE_MOCK_API) {
    await mockDelay(undefined);
    return;
  }

  await apiRequest<void>("/auth/session", { method: "DELETE" });
}
