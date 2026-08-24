import {
  ApiError,
  createGuestSession,
  createPairingCode,
  ensureSession,
  redeemPairingCode,
  authedFetchWithRetry,
} from './api-client.js';
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

async function handleBackendCreatePairingCode() {
  const session = await ensureSession();
  if (!session) return { ok: false, error: 'not_connected' };
  try {
    const { code, expiresAt } = await createPairingCode();
    return { ok: true, code, expiresAt };
  } catch (err) {
    return { ok: false, error: (err instanceof ApiError && err.code) || 'pairing-failed' };
  }
}

async function handleBackendIsPageSaved(payload) {
  const session = await ensureSession();
  if (!session || !payload || !payload.url) return { ok: true, saved: false };
  try {
    const list = await authedFetchWithRetry('/api/v1/saved-pages?limit=100');
    if (!list || !Array.isArray(list.items)) return { ok: true, saved: false };
    const normalize = (u) => {
      try {
        const parsed = new URL(u);
        return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}${parsed.search}`;
      } catch (e) {
        return (u || '').split('#')[0].replace(/\/+$/, '');
      }
    };
    const targetUrl = normalize(payload.url);
    const isSaved = list.items.some((item) => {
      if (!item.original_url) return false;
      return normalize(item.original_url) === targetUrl;
    });
    return { ok: true, saved: isSaved };
  } catch (err) {
    return { ok: false, error: (err instanceof ApiError && err.code) || 'check-failed', saved: false };
  }
}

async function handleBackendRedeemPairingCode(payload) {
  try {
    const session = await redeemPairingCode(payload.code);
    return { ok: true, userId: session.userId };
  } catch (err) {
    return { ok: false, error: (err instanceof ApiError && err.code) || 'pairing-failed' };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return undefined;

  switch (message.type) {
    case 'BACKEND_CONNECT':
      handleBackendConnect().then(sendResponse);
      return true;
    case 'BACKEND_STATUS':
      handleBackendStatus().then(sendResponse);
      return true;
    case 'BACKEND_SAVE_PAGE':
      handleBackendSavePage(message.payload || {}).then(sendResponse);
      return true;
    case 'BACKEND_IS_PAGE_SAVED':
      handleBackendIsPageSaved(message.payload || {}).then(sendResponse);
      return true;
    case 'BACKEND_CREATE_PAIRING_CODE':
      handleBackendCreatePairingCode().then(sendResponse);
      return true;
    case 'BACKEND_REDEEM_PAIRING_CODE':
      handleBackendRedeemPairingCode(message.payload || {}).then(sendResponse);
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
  // Left over from the removed AI vision scan: drop the user's Gemini API key and the
  // cached image descriptions so neither lingers in local storage after the upgrade.
  chrome.storage.local.remove(['geminiApiKey', 'a11yImageCache']);

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
        },
      });
    }
  });
});
