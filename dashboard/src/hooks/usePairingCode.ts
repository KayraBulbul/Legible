import { useCallback, useEffect, useRef, useState } from "react";
import { createPairingCode, type PairingCode } from "@/api/auth";
import { ApiError } from "@/api/client";
import {
  PAIRING_CODE_LIFETIME_MS,
  millisecondsUntil,
} from "@/utils/pairingCode";

/**
 * How often the countdown re-reads the clock. Faster than one second so the
 * progress ring moves rather than stepping, and so the displayed seconds flip
 * close to when they actually change instead of up to a second late.
 */
const TICK_MS = 250;

/**
 * State of the most recent request, kept separate from whether a code is on
 * screen: a failed request does not invalidate a code that is already out
 * there, so the two can be true at once.
 */
export type PairingRequestStatus = "idle" | "requesting" | "done" | "error";

export interface PairingCodeState {
  requestStatus: PairingRequestStatus;
  /** The most recently issued code, expired or not; null before the first one. */
  code: string | null;
  /** Milliseconds left before the backend stops accepting `code`. Zero once dead. */
  remainingMs: number;
  /** 0 at issue through 1 at expiry — drives the progress ring. */
  elapsedFraction: number;
  /** Set when the last request failed. Does not imply `code` is unusable. */
  error: string | null;
  /** Asks for a fresh code, retiring whatever the last one was. */
  request: () => void;
}

function describeError(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 429) {
      return "You have created too many codes in the last hour. Try again later.";
    }
    if (cause.isUnauthorized) {
      return "This session is no longer valid. Pair the dashboard again.";
    }
    return cause.message;
  }
  return "Could not reach the server. Try again.";
}

/**
 * Owns one pairing code and the countdown to its expiry.
 *
 * A code is single-use and lives ten minutes (backend/api/services/auth.py).
 * Nothing tells the client when it is redeemed or when it lapses, so the
 * deadline is tracked here and the caller is told the moment it dies —
 * presenting a dead code as live invites someone to type it and be told, with
 * no explanation, that it is invalid.
 *
 * The countdown is recomputed from the absolute `expiresAt` on every tick
 * rather than decremented. A backgrounded tab throttles its timers and a
 * sleeping machine stops them entirely, so a decremented counter would come
 * back reading whatever it was when it froze.
 *
 * A failed request deliberately leaves any existing code in place. The
 * backend retires the previous code only when it successfully issues a new
 * one, so after, say, a rate-limited retry the code already on screen is
 * still the one that works — throwing it away would strand the user.
 */
export function usePairingCode(): PairingCodeState {
  const [issued, setIssued] = useState<PairingCode | null>(null);
  const [requestStatus, setRequestStatus] =
    useState<PairingRequestStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);

  // Guards against a slow request resolving after the dialog closed, or after
  // a second request superseded it.
  const requestIdRef = useRef(0);

  useEffect(
    () => () => {
      requestIdRef.current += 1;
    },
    [],
  );

  useEffect(() => {
    if (!issued) return;

    function tick() {
      setRemainingMs(millisecondsUntil(issued!.expiresAt));
    }

    tick();
    const timer = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(timer);
  }, [issued]);

  const request = useCallback(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setRequestStatus("requesting");
    setError(null);

    createPairingCode().then(
      (next) => {
        if (requestIdRef.current !== requestId) return;
        setIssued(next);
        setRemainingMs(millisecondsUntil(next.expiresAt));
        setRequestStatus("done");
      },
      (cause: unknown) => {
        if (requestIdRef.current !== requestId) return;
        setError(describeError(cause));
        setRequestStatus("error");
      },
    );
  }, []);

  return {
    requestStatus,
    code: issued?.code ?? null,
    remainingMs,
    elapsedFraction: issued
      ? Math.min(1, 1 - remainingMs / PAIRING_CODE_LIFETIME_MS)
      : 0,
    error,
    request,
  };
}
