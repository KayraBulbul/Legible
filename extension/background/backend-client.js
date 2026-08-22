const DEFAULT_API_BASE_URL = 'https://hackmelbourne2026-production.up.railway.app';
const ACCESS_TOKEN_KEY = 'backendAccessToken';

async function getApiBaseUrl() {
  const { backendApiBaseUrl } = await chrome.storage.local.get(['backendApiBaseUrl']);
  return (backendApiBaseUrl || DEFAULT_API_BASE_URL).replace(/\/$/, '');
}

async function createGuestSession(apiBaseUrl) {
  const response = await fetch(`${apiBaseUrl}/api/v1/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
  });
  if (!response.ok) throw new Error('backend-session-failed');

  const body = await response.json();
  const accessToken = body?.session?.accessToken;
  if (!accessToken) throw new Error('backend-session-invalid');
  await chrome.storage.local.set({ [ACCESS_TOKEN_KEY]: accessToken });
  return accessToken;
}

async function getAccessToken(apiBaseUrl) {
  const { [ACCESS_TOKEN_KEY]: accessToken } = await chrome.storage.local.get([ACCESS_TOKEN_KEY]);
  return accessToken || createGuestSession(apiBaseUrl);
}

async function postAuthenticated(path, payload, retryAuthentication = true) {
  const apiBaseUrl = await getApiBaseUrl();
  const accessToken = await getAccessToken(apiBaseUrl);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    credentials: 'omit',
    body: JSON.stringify(payload),
  });

  if (response.status === 401 && retryAuthentication) {
    await chrome.storage.local.remove(ACCESS_TOKEN_KEY);
    return postAuthenticated(path, payload, false);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.code || `backend-error-${response.status}`);
  }
  return response.json();
}

export async function analyzeImage({ dataUrl, kind, contextText }) {
  return postAuthenticated('/api/v1/image-descriptions', {
    kind,
    dataUrl,
    ...(contextText ? { contextText } : {}),
  });
}
