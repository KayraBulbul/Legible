import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser } from "@/api/auth";
import {
  fetchCurrentUser,
  redeemPairingCode,
  revokeCurrentSession,
  updateDisplayName,
} from "@/api/auth";
import { ApiError, getAccessToken, setAccessToken } from "@/api/client";
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
} from "@/context/authContext";

/** Turns anything thrown by the API layer into something worth showing next to the pairing input. */
function describePairError(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.code === "invalid_pairing_code") {
      return "That code is invalid or has expired. Generate a new one from the extension.";
    }
    if (cause.status === 429) {
      return "Too many attempts. Wait a moment and try again.";
    }
    return cause.message;
  }
  return "Could not reach the server. Try again.";
}

/**
 * Owns pairing/session state for the whole app. A token persisted from a
 * previous pairing (see src/api/client.ts) is revalidated against
 * `GET /auth/me` on mount rather than trusted outright, since it may have
 * expired or been revoked from the extension side.
 *
 * Mock mode (no `VITE_API_BASE_URL`, see src/api/client.ts) is gated the
 * same way as a real backend rather than skipping straight to
 * "authenticated" — that lets the pairing screen itself be exercised
 * without one. `pair()` accepts any code in mock mode (src/api/auth.ts).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Decided once, up front, so the effect below only ever writes state
  // asynchronously (from a promise callback) rather than on every mount —
  // see the equivalent note in LibraryProvider.
  const [status, setStatus] = useState<AuthStatus>(() =>
    getAccessToken() ? "checking" : "unauthenticated",
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isPairing, setIsPairing] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) return;

    const controller = new AbortController();

    fetchCurrentUser(controller.signal).then(
      (nextUser) => {
        if (controller.signal.aborted) return;
        setUser(nextUser);
        setStatus("authenticated");
      },
      () => {
        if (controller.signal.aborted) return;
        // A stale, expired, or revoked token is not worth keeping around.
        setAccessToken(null);
        setStatus("unauthenticated");
      },
    );

    return () => controller.abort();
  }, []);

  const pair = useCallback(async (code: string) => {
    setIsPairing(true);
    setPairError(null);
    try {
      const nextUser = await redeemPairingCode(code);
      setUser(nextUser);
      setStatus("authenticated");
    } catch (cause) {
      setPairError(describePairError(cause));
      throw cause;
    } finally {
      setIsPairing(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await revokeCurrentSession();
    } catch {
      // The token is being discarded locally regardless.
    }
    setAccessToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const setDisplayName = useCallback(async (displayName: string | null) => {
    const nextUser = await updateDisplayName(displayName);
    setUser(nextUser);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isPairing,
      pairError,
      pair,
      signOut,
      setDisplayName,
    }),
    [status, user, isPairing, pairError, pair, signOut, setDisplayName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
