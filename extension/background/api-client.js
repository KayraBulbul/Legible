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

export {
  ApiError,
  API_BASE_URL,
  createGuestSession,
  ensureSession,
  getStoredSession,
  clearStoredSession,
  authedFetch,
  authedFetchWithRetry,
};
