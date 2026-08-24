import { createContext, useContext } from "react";
import type { AuthUser } from "@/api/auth";

/**
 * The dashboard has no login of its own. It starts unpaired, and becomes
 * authenticated only by redeeming a pairing code minted on an already
 * signed-in extension (docs/api.md, "Pair extension and dashboard").
 *
 *   checking       validating a persisted token from a previous visit
 *   unauthenticated no valid token — the pairing screen owns the UI
 *   authenticated   paired; `user` is populated
 */
export type AuthStatus = "checking" | "unauthenticated" | "authenticated";

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;

  /** True while a redeem request is in flight. */
  isPairing: boolean;
  /** Set on the most recent failed redeem attempt; cleared on the next try. */
  pairError: string | null;
  /** Redeems a pairing code and, on success, moves `status` to "authenticated". */
  pair: (code: string) => Promise<void>;

  /** Revokes the session and returns to "unauthenticated". */
  signOut: () => Promise<void>;

  /** Sets or clears the current user's display name and updates `user` on success. */
  setDisplayName: (displayName: string | null) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
