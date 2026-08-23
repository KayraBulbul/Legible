import { analyzeImage } from './gemini-client.js';
import { ApiError, createGuestSession, ensureSession, authedFetchWithRetry } from './api-client.js';
import { mapA11ySettingsToBackend } from './settings-mapper.js';

// The settings panel is injected into the page as a floating overlay rather than opened in
// Chrome's side panel, so it never reflows the site underneath it. The toolbar icon toggles it.
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' });
  } catch (e) {
    // No content script on this tab (e.g. chrome:// pages) - ignore.
  }
});

const CACHE_KEY = 'a11yImageCache';
const MAX_CACHE_ENTRIES = 500;

async function hashKey(str) {
  const enc = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getCache() {
  const { [CACHE_KEY]: cache } = await chrome.storage.local.get([CACHE_KEY]);
  return cache || {};
}

async function setCacheEntry(key, value) {
  const cache = await getCache();
  cache[key] = { ...value, ts: Date.now() };
  const keys = Object.keys(cache);
  if (keys.length > MAX_CACHE_ENTRIES) {
    keys
      .sort((a, b) => cache[a].ts - cache[b].ts)
      .slice(0, keys.length - MAX_CACHE_ENTRIES)
      .forEach((k) => delete cache[k]);
  }
  await chrome.storage.local.set({ [CACHE_KEY]: cache });
}

async function handleAnalyzeImage(payload) {
  const { dataUrl, kind, cacheKey } = payload;
  const { geminiApiKey } = await chrome.storage.local.get(['geminiApiKey']);
  if (!geminiApiKey) {
    return { ok: false, error: 'missing-api-key' };
  }

  const key = await hashKey(`${kind}:${cacheKey || dataUrl.slice(0, 512)}`);
  const cache = await getCache();
  if (cache[key]) {
    return { ok: true, result: cache[key], cached: true };
  }

  try {
    const result = await analyzeImage({ dataUrl, kind }, geminiApiKey);
    await setCacheEntry(key, result);
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err.message || 'analysis-failed' };
  }
}

async function handleBackendConnect() {
  try {
    const existing = await ensureSession();
    if (existing) return { ok: true, connected: true, userId: existing.userId };
    const session = await createGuestSession();
    return { ok: true, connected: true, userId: session.userId };
  } catch (err) {
    return { ok: false, error: (err instanceof ApiError && err.code) || 'connect-failed' };
  }
}

async function handleBackendStatus() {
  const session = await ensureSession();
  return { ok: true, connected: !!session, userId: session ? session.userId : null };
}

async function handleBackendSavePage(payload) {
  const session = await ensureSession();
  if (!session) return { ok: false, error: 'not_connected' };

  const body = {
    clientSaveId: crypto.randomUUID(),
    originalUrl: payload.originalUrl,
    title: payload.title,
    capturedAt: new Date().toISOString(),
    sourceDocument: payload.sourceDocument,
    transformedDocument: null,
    accessibilitySettings: mapA11ySettingsToBackend(payload.a11ySettings),
    transformations: [],
    profileId: null,
  };

  try {
    const savedPage = await authedFetchWithRetry('/api/v1/saved-pages', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { ok: true, savedPage };
  } catch (err) {
    return { ok: false, error: (err instanceof ApiError && err.code) || 'save-failed' };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return undefined;

  switch (message.type) {
    case 'AI_ANALYZE_IMAGE':
      handleAnalyzeImage(message.payload).then(sendResponse);
      return true;
    case 'BACKEND_CONNECT':
      handleBackendConnect().then(sendResponse);
      return true;
    case 'BACKEND_STATUS':
      handleBackendStatus().then(sendResponse);
      return true;
    case 'BACKEND_SAVE_PAGE':
      handleBackendSavePage(message.payload || {}).then(sendResponse);
      return true;
    default:
      return undefined;
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'COMMAND', command });
  } catch (e) {
    // No content script on this tab (e.g. chrome:// pages) - ignore.
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['a11ySettings'], (res) => {
    if (!res.a11ySettings) {
      chrome.storage.local.set({
        a11ySettings: {
          extensionEnabled: true,
          dyslexiaFont: 'none',
          themeMode: 'none',
          declutter: false,
          pauseAnimations: false,
          bionicReading: false,
          fontScale: 100,
          letterSpacing: 0,
          lineHeight: null,
          highlightLinks: false,
          hideImages: false,
          cursorEnabled: false,
          cursorStyle: 'arrow',
          cursorSize: 32,
          cursorColor: '#2563eb',
          ttsRate: 1,
          ttsPitch: 1,
          voiceURI: null,
          toolbarVisible: true,
          extTheme: 'light',
          aiEnabled: true,
        },
      });
    }
  });
});
