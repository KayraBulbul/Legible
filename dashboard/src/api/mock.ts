/**
 * Support for the mock repository branches. Everything here disappears with
 * the fixtures once the backend lands — nothing outside src/api imports it.
 */

/** Enough latency for loading and optimistic states to be exercised in dev. */
const MOCK_LATENCY_MS = 120;

export function mockDelay<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), MOCK_LATENCY_MS);
  });
}

/** Stand-in for the server-assigned UUIDs the real API returns. */
export function mockId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}
