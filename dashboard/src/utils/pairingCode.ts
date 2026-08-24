/* ============================================================================
 * PAIRING CODE
 * ----------------------------------------------------------------------------
 * Pure helpers for the one-time code that links a second client to the same
 * anonymous user (docs/api.md, "Pair extension and dashboard"). Nothing here
 * talks to the network — src/api/auth.ts owns the wire calls.
 *
 * Pairing links sessions; it does not copy saved pages. Both clients resolve
 * to the same `user.id`, so they read one library.
 * ==========================================================================*/

/**
 * Mirrors the backend alphabet (backend/api/services/auth.py). I, O, 0 and 1
 * are omitted so a code read aloud off another screen cannot be transcribed
 * ambiguously. The API's schema rejects anything outside this set outright
 * and does no normalising of its own, so a code pasted with dashes, spaces,
 * or in lower case has to be cleaned up here or it fails validation with a
 * 422 that says nothing useful to the person typing it.
 */
export const PAIRING_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export const PAIRING_CODE_LENGTH = 8;

/** `PAIRING_CODE_LIFETIME` in backend/api/services/auth.py. */
export const PAIRING_CODE_LIFETIME_MS = 10 * 60 * 1000;

/** Uppercases, then drops every character the backend would reject. */
export function normalizePairingCode(raw: string): string {
  return raw
    .toUpperCase()
    .split("")
    .filter((character) => PAIRING_CODE_ALPHABET.includes(character))
    .join("")
    .slice(0, PAIRING_CODE_LENGTH);
}

/** True once the cleaned-up code is long enough to be worth sending. */
export function isCompletePairingCode(raw: string): boolean {
  return normalizePairingCode(raw).length === PAIRING_CODE_LENGTH;
}

/**
 * Milliseconds until `expiresAt`, floored at zero. Read from the absolute
 * deadline rather than counted down, so a suspended tab or a sleeping
 * machine resumes showing the truth instead of a stale number.
 */
export function millisecondsUntil(expiresAt: string, now = Date.now()): number {
  const deadline = new Date(expiresAt).getTime();
  if (Number.isNaN(deadline)) return 0;
  return Math.max(0, deadline - now);
}

/** `m:ss`, rounded up so the last visible second is a full one. */
export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

/** Spoken form for screen readers, which read "9:58" as a time of day. */
export function describeCountdown(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  if (totalSeconds <= 0) return "This code has expired.";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  if (seconds > 0) parts.push(`${seconds} second${seconds === 1 ? "" : "s"}`);
  return `This code expires in ${parts.join(" ")}.`;
}
