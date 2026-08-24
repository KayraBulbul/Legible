import { USE_MOCK_API, apiRequest, setAccessToken } from "@/api/client";
import { mockDelay } from "@/api/mock";
import {
  PAIRING_CODE_ALPHABET,
  PAIRING_CODE_LENGTH,
  PAIRING_CODE_LIFETIME_MS,
  normalizePairingCode,
} from "@/utils/pairingCode";

/* ============================================================================
 * AUTH REPOSITORY
 * ----------------------------------------------------------------------------
 * The dashboard never creates its own guest session — it joins one that
 * already exists in the extension by redeeming a pairing code (docs/api.md,
 * "Pair extension and dashboard"). Once joined it is an ordinary session for
 * that same user, so it can mint codes of its own to link a third client.
 * This is the only module that knows the wire shape of that exchange.
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

/** `PairingCodeResponse` in docs/api.md. */
export interface PairingCode {
  code: string;
  /** ISO-8601 instant, ten minutes out. The UI counts down to it. */
  expiresAt: string;
}

/**
 * Mints a one-time code another client can redeem to join this same user.
 * Requires the current session, and invalidates any previous unused code for
 * it — so the newest code on screen is always the only one that still works.
 * Throws {@link ApiError} `pairing_rate_limited` (429) past five codes an
 * hour — see docs/api.md.
 */
export async function createPairingCode(): Promise<PairingCode> {
  if (USE_MOCK_API) {
    // A real-shaped code and deadline, so the countdown and its expiry state
    // stay exercisable without a backend — the dashboard is mock-first.
    const code = Array.from(
      { length: PAIRING_CODE_LENGTH },
      () =>
        PAIRING_CODE_ALPHABET[
          Math.floor(Math.random() * PAIRING_CODE_ALPHABET.length)
        ],
    ).join("");
    return mockDelay({
      code,
      expiresAt: new Date(Date.now() + PAIRING_CODE_LIFETIME_MS).toISOString(),
    });
  }

  return apiRequest<PairingCode>("/auth/pairing-codes", { method: "POST" });
}

/**
 * Redeems a one-time pairing code created on the paired extension, then
 * stores the returned token so subsequent requests are authenticated. The
 * code is cleaned to the backend's alphabet first (@/utils/pairingCode):
 * people retype these off another screen, and the API normalises nothing.
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
    body: { code: normalizePairingCode(code) },
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
