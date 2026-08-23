/* Backend API client: guest auth + authenticated fetch against the production accessibility API */

const API_BASE_URL = 'https://hackmelbourne2026-production.up.railway.app';
const SESSION_KEY = 'backendSession';
const RETRYABLE_STATUSES = new Set([502, 503]);

class ApiError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

async function parseErrorCode(response) {
  try {
    const body = await response.json();
    return (body && body.error && body.error.code) || 'unknown_error';
  } catch (e) {
    return 'unknown_error';
  }
}

async function getStoredSession() {
  const { [SESSION_KEY]: session } = await chrome.storage.local.get([SESSION_KEY]);
  return session || null;
}

async function setStoredSession(session) {
  await chrome.storage.local.set({ [SESSION_KEY]: session });
}

async function clearStoredSession() {
  await chrome.storage.local.remove([SESSION_KEY]);
}

function isExpired(session) {
  if (!session || !session.expiresAt) return true;
  return new Date(session.expiresAt).getTime() <= Date.now();
}

async function createGuestSession() {
  const resp = await fetch(`${API_BASE_URL}/api/v1/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
  });
  if (!resp.ok) {
    const code = await parseErrorCode(resp);
    throw new ApiError(resp.status, code, `Failed to create guest session (${code})`);
  }
  const data = await resp.json();
  const session = {
    accessToken: data.session.accessToken,
    expiresAt: data.session.expiresAt,
    userId: data.user.id,
  };
  await setStoredSession(session);
  return session;
}

/** Returns a non-expired stored session, or null. Never creates one silently. */
async function ensureSession() {
  const existing = await getStoredSession();
  if (existing && !isExpired(existing)) return existing;
  if (existing) await clearStoredSession();
  return null;
}

async function authedFetch(path, options = {}) {
  const session = await getStoredSession();
  if (!session || isExpired(session)) {
    throw new ApiError(401, 'not_connected', 'Not connected to the backend yet.');
  }

  const resp = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
      ...(options.headers || {}),
    },
  });

  if (resp.status === 401) {
    await clearStoredSession();
    const code = await parseErrorCode(resp);
    throw new ApiError(401, code, 'Session expired or revoked. Please connect again.');
  }

  if (!resp.ok) {
    const code = await parseErrorCode(resp);
    throw new ApiError(resp.status, code, `Request failed (${resp.status}: ${code})`);
  }

  if (resp.status === 204) return null;
  return resp.json();
}

/** Retries only transient 502/503 failures with a short bounded backoff, per docs/api.md. */
async function authedFetchWithRetry(path, options, retries = 2) {
  let attempt = 0;
  for (;;) {
    try {
      return await authedFetch(path, options);
    } catch (err) {
      const canRetry = err instanceof ApiError && RETRYABLE_STATUSES.has(err.status) && attempt < retries;
      if (!canRetry) throw err;
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }
}

/* Pairing links a second client to the SAME anonymous user, so both see one saved-page
   library. It does not copy pages between devices, and revoking one session leaves the
   other signed in. */

// The backend alphabet omits I, O, 0 and 1 to avoid transcription errors, and its schema
// rejects anything but eight uppercase characters from that set - there is no server-side
// normalization. Users type codes read off another screen, so strip the spaces and dashes
// they add and fix the case here, or a perfectly good code 422s.
const PAIRING_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PAIRING_CODE_LENGTH = 8;

function normalizePairingCode(raw) {
  return String(raw || '')
    .toUpperCase()
    .split('')
    .filter((ch) => PAIRING_CODE_ALPHABET.includes(ch))
    .join('');
}

function isValidPairingCode(raw) {
  return normalizePairingCode(raw).length === PAIRING_CODE_LENGTH;
}

/** Asks the backend for a code this device can read out to another one. Authenticated. */
async function createPairingCode() {
  const data = await authedFetch('/api/v1/auth/pairing-codes', { method: 'POST' });
  return { code: data.code, expiresAt: data.expiresAt };
}

/** Redeems a code from another device. Deliberately unauthenticated: the whole point is
    that this client has no session for the target user yet. On success the stored session
    is REPLACED, so any pages saved under this device's previous guest user stop being
    reachable from here. Callers must confirm with the user before calling this. */
async function redeemPairingCode(rawCode) {
  const code = normalizePairingCode(rawCode);
  if (code.length !== PAIRING_CODE_LENGTH) {
    throw new ApiError(400, 'invalid_pairing_code', 'Enter the 8-character code from the other device.');
  }

  const resp = await fetch(`${API_BASE_URL}/api/v1/auth/pairing-codes/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
    body: JSON.stringify({ code }),
  });

  if (!resp.ok) {
    const errCode = await parseErrorCode(resp);
    throw new ApiError(resp.status, errCode, `Could not use that code (${errCode})`);
  }

  const data = await resp.json();
  const session = {
    accessToken: data.session.accessToken,
    expiresAt: data.session.expiresAt,
    userId: data.user.id,
  };
  await setStoredSession(session);
  return session;
}

export {
  ApiError,
  API_BASE_URL,
  createGuestSession,
  createPairingCode,
  redeemPairingCode,
  normalizePairingCode,
  isValidPairingCode,
  ensureSession,
  getStoredSession,
  clearStoredSession,
  authedFetch,
  authedFetchWithRetry,
};
