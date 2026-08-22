import { analyzeImage } from './backend-client.js';

if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

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

  const key = await hashKey(`${kind}:${cacheKey || dataUrl.slice(0, 512)}`);
  const cache = await getCache();
  if (cache[key]) {
    return { ok: true, result: cache[key], cached: true };
  }

  try {
    const result = await analyzeImage({ dataUrl, kind });
    await setCacheEntry(key, result);
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err.message || 'analysis-failed' };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'AI_ANALYZE_IMAGE') return undefined;
  handleAnalyzeImage(message.payload).then(sendResponse);
  return true;
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
  chrome.storage.local.remove('geminiApiKey');
  chrome.storage.local.get(['a11ySettings'], (res) => {
    if (!res.a11ySettings) {
      chrome.storage.local.set({
        a11ySettings: {
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
          cursorStyle: 'ring',
          cursorSize: 32,
          cursorColor: '#5b3cdc',
          ttsRate: 1,
          ttsPitch: 1,
          voiceURI: null,
          hudVisible: true,
          aiEnabled: true,
        },
      });
    }
  });
});
