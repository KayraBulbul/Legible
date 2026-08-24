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

/* ---------- Pomodoro timer ----------
   State lives here (not in the sidebar) because the sidebar is an iframe that only exists
   while its host page is open, while a session needs to keep counting down across tab
   switches and even a fully-closed panel. `chrome.alarms` is what makes that possible: unlike
   setInterval/setTimeout in this service worker, an alarm still fires after the worker itself
   has been unloaded. The sidebar just reads/renders this state and sends control messages. */

const POMODORO_ALARM_SESSION = 'pomodoroSessionEnd';
const POMODORO_ALARM_BADGE = 'pomodoroBadgeTick';
const POMODORO_STORAGE_KEY = 'pomodoroState';

const DEFAULT_POMODORO_SETTINGS = {
  workMin: 25,
  shortBreakMin: 5,
  autoStartNext: true,
  notify: true,
};

// endsAt is an absolute deadline (like the pairing code's expiry), not a counter, so a
// throttled or backgrounded panel never renders a stale number - it just recomputes from now().
const DEFAULT_POMODORO_STATE = {
  mode: 'work',
  running: false,
  endsAt: null,
  remainingMs: null,
  cyclesCompleted: 0,
  settings: DEFAULT_POMODORO_SETTINGS,
};

const POMODORO_MODE_TITLE = { work: 'Focus session', shortBreak: 'Short break' };
const POMODORO_BADGE_COLORS = { work: '#F57600', shortBreak: '#15803d' };

async function getPomodoroState() {
  const res = await chrome.storage.local.get([POMODORO_STORAGE_KEY]);
  const stored = res[POMODORO_STORAGE_KEY] || {};
  return {
    ...DEFAULT_POMODORO_STATE,
    ...stored,
    settings: { ...DEFAULT_POMODORO_SETTINGS, ...(stored.settings || {}) },
  };
}

async function updatePomodoroBadge(state) {
  if (!state.running || !state.endsAt) {
    await chrome.action.setBadgeText({ text: '' });
    return;
  }
  const minutesLeft = Math.max(1, Math.ceil((state.endsAt - Date.now()) / 60000));
  // "m" rather than "min" - Chrome truncates badge text to ~4 visible characters, and even the
  // longest case here (a 2-digit minute count) stays comfortably inside that as "99m".
  await chrome.action.setBadgeText({ text: `${minutesLeft}m` });
  await chrome.action.setBadgeBackgroundColor({ color: POMODORO_BADGE_COLORS[state.mode] || '#F57600' });
}

async function savePomodoroState(state) {
  await chrome.storage.local.set({ [POMODORO_STORAGE_KEY]: state });
  await updatePomodoroBadge(state);
  return state;
}

function pomodoroModeDurationMs(mode, settings) {
  const minutes = mode === 'work' ? settings.workMin : settings.shortBreakMin;
  return Math.max(1, minutes || 1) * 60 * 1000;
}

// Just a toggle now that there's no long break: every focus session is followed by a short
// break and vice versa, indefinitely.
function pomodoroNextMode(mode) {
  return mode === 'work' ? 'shortBreak' : 'work';
}

function clearPomodoroAlarms() {
  chrome.alarms.clear(POMODORO_ALARM_SESSION);
  chrome.alarms.clear(POMODORO_ALARM_BADGE);
}

// The badge only shows whole minutes, but the session-end alarm still needs to land on the
// exact second so a session can't overrun; hence two alarms with different shapes.
function schedulePomodoroAlarms(endsAt) {
  chrome.alarms.create(POMODORO_ALARM_SESSION, { when: endsAt });
  chrome.alarms.create(POMODORO_ALARM_BADGE, { periodInMinutes: 1 });
}

async function notifyPomodoro(title, message) {
  try {
    await chrome.notifications.create(`pomodoro-${Date.now()}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title,
      message,
      priority: 2,
    });
  } catch (e) {
    // Notifications can be denied at the OS level; the badge and in-panel state still work.
  }
}

async function handlePomodoroStart() {
  const state = await getPomodoroState();
  if (state.running) return { ok: true, state };
  const durationMs = state.remainingMs != null ? state.remainingMs : pomodoroModeDurationMs(state.mode, state.settings);
  const endsAt = Date.now() + durationMs;
  const next = { ...state, running: true, endsAt, remainingMs: null };
  schedulePomodoroAlarms(endsAt);
  await savePomodoroState(next);
  return { ok: true, state: next };
}

async function handlePomodoroPause() {
  const state = await getPomodoroState();
  if (!state.running) return { ok: true, state };
  const remainingMs = Math.max(0, (state.endsAt || Date.now()) - Date.now());
  const next = { ...state, running: false, endsAt: null, remainingMs };
  clearPomodoroAlarms();
  await savePomodoroState(next);
  return { ok: true, state: next };
}

async function handlePomodoroReset() {
  const state = await getPomodoroState();
  const next = { ...DEFAULT_POMODORO_STATE, settings: state.settings };
  clearPomodoroAlarms();
  await savePomodoroState(next);
  return { ok: true, state: next };
}

/* Shared by both the session-end alarm and the manual Skip button: mode advances the same
   way either way, they just differ on whether a notification is worth firing. */
async function advancePomodoroMode(state, { notify }) {
  const completedMode = state.mode;
  const cyclesCompleted = completedMode === 'work' ? state.cyclesCompleted + 1 : state.cyclesCompleted;
  const nextMode = pomodoroNextMode(completedMode);

  if (notify && state.settings.notify !== false) {
    const upNext = POMODORO_MODE_TITLE[nextMode];
    await notifyPomodoro(`${POMODORO_MODE_TITLE[completedMode]} complete`, `Time for a ${upNext.toLowerCase()}.`);
    // Calming chime off a finished study session, alarming beeps off a finished break - the
    // sound itself carries which way the transition just went, on top of the notification text.
    await playPomodoroSessionCue(completedMode === 'work' ? 'calm' : 'alarm');
  }

  if (state.settings.autoStartNext !== false) {
    const endsAt = Date.now() + pomodoroModeDurationMs(nextMode, state.settings);
    schedulePomodoroAlarms(endsAt);
    return { ...state, mode: nextMode, cyclesCompleted, running: true, endsAt, remainingMs: null };
  }

  clearPomodoroAlarms();
  return { ...state, mode: nextMode, cyclesCompleted, running: false, endsAt: null, remainingMs: null };
}

async function handlePomodoroSkip() {
  const state = await getPomodoroState();
  const next = await advancePomodoroMode(state, { notify: false });
  await savePomodoroState(next);
  return { ok: true, state: next };
}

async function handlePomodoroUpdateSettings(payload) {
  const state = await getPomodoroState();
  const settings = { ...state.settings, ...(payload || {}) };
  // A duration edited while idle/paused should show up immediately; a session already
  // running keeps its own length so it never gets abruptly shortened out from under
  // whoever is mid-session.
  const next = { ...state, settings, remainingMs: state.running ? state.remainingMs : null };
  await savePomodoroState(next);
  return { ok: true, state: next };
}

async function handlePomodoroGetState() {
  return { ok: true, state: await getPomodoroState() };
}

// Registered synchronously at module top level (a requirement for MV3 service workers) so
// Chrome can wake this worker specifically to deliver the alarm even after it was unloaded.
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POMODORO_ALARM_SESSION) {
    getPomodoroState().then(async (state) => {
      if (!state.running) return;
      const next = await advancePomodoroMode(state, { notify: true });
      await savePomodoroState(next);
    });
  } else if (alarm.name === POMODORO_ALARM_BADGE) {
    getPomodoroState().then((state) => {
      if (!state.running) {
        chrome.alarms.clear(POMODORO_ALARM_BADGE);
        return;
      }
      updatePomodoroBadge(state);
    });
  }
});

/* ---------- Focus Sounds (music) ----------
   Playback itself happens in an offscreen document (extension/offscreen/), not here and not in
   the sidebar iframe, because both of those go away when their tab/panel closes while an
   offscreen document doesn't. This service worker just owns the track library, persists the
   current selection, and relays control messages to whichever offscreen document is playing. */

const MUSIC_STORAGE_KEY = 'musicState';

// A track with `generator` is synthesized live in the offscreen document (see
// extension/offscreen/offscreen.js's GENERATORS) - no audio file needed. A track with `src`
// points at a file this repo does not ship yet; picking one before that file exists surfaces a
// real "could not load" status rather than silence. Generator names here must match a key in
// offscreen.js's GENERATORS table exactly.
const MUSIC_LIBRARY = {
  whiteNoise: { label: 'White Noise', icon: 'graphic_eq', tracks: [{ id: 'default', label: 'White Noise', generator: 'white' }] },
  brownNoise: { label: 'Brown Noise', icon: 'water_drop', tracks: [{ id: 'default', label: 'Brown Noise', generator: 'brown' }] },
  // Generated chord-loop-plus-drums patterns (see playLofi in offscreen.js), not real
  // recordings - a generative approximation of the mood, not actual hip-hop production.
  lofi: {
    label: 'Lo-fi', icon: 'headphones',
    tracks: [
      { id: 'lofi-rainy', label: 'Rainy Day', generator: 'lofi-rainy' },
      { id: 'lofi-latenight', label: 'Late Night', generator: 'lofi-latenight' },
      { id: 'lofi-studybreak', label: 'Study Break', generator: 'lofi-studybreak' },
    ],
  },
  // Generated arpeggiated chord progressions (see playClassical in offscreen.js) - a plausible
  // piano-ish pattern, not a performance of any real composition.
  classical: {
    label: 'Classical', icon: 'piano',
    tracks: [
      { id: 'classical-moonlight', label: 'Moonlight', generator: 'classical-moonlight' },
      { id: 'classical-reverie', label: 'Reverie', generator: 'classical-reverie' },
      { id: 'classical-sonata', label: 'Sonata', generator: 'classical-sonata' },
    ],
  },
  // Warm/airy/deep are detuned-oscillator drones, not recordings - see playAmbientDrone in
  // offscreen.js. Genuinely synthesized, so no licensing question, unlike Lo-fi/Classical above.
  ambient: {
    label: 'Ambient', icon: 'blur_on',
    tracks: [
      { id: 'ambient-warm', label: 'Warm Drone', generator: 'ambient-warm' },
      { id: 'ambient-airy', label: 'Airy Pad', generator: 'ambient-airy' },
      { id: 'ambient-deep', label: 'Deep Space', generator: 'ambient-deep' },
    ],
  },
  nature: {
    label: 'Nature', icon: 'forest',
    tracks: [
      // Rain/ocean are filtered, modulated noise - synthesizable honestly. Forest (birdsong,
      // footsteps) is not something noise-shaping can fake convincingly, so it stays file-based.
      { id: 'rain', label: 'Rain', generator: 'rain' },
      { id: 'ocean', label: 'Ocean Waves', generator: 'ocean' },
      { id: 'forest', label: 'Forest', src: 'audio/nature/forest.mp3' },
    ],
  },
};

const DEFAULT_MUSIC_STATE = {
  categoryId: 'whiteNoise',
  trackId: 'default',
  volume: 0.6,
  playing: false,
  lastError: null,
};

async function getMusicState() {
  const res = await chrome.storage.local.get([MUSIC_STORAGE_KEY]);
  return { ...DEFAULT_MUSIC_STATE, ...(res[MUSIC_STORAGE_KEY] || {}) };
}

async function saveMusicState(state) {
  await chrome.storage.local.set({ [MUSIC_STORAGE_KEY]: state });
  return state;
}

function resolveTrack(categoryId, trackId) {
  const category = MUSIC_LIBRARY[categoryId];
  if (!category) return null;
  return category.tracks.find((t) => t.id === trackId) || category.tracks[0] || null;
}

async function ensureOffscreenDocument() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen/offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Plays focus/ambient background audio continuously while the user reads, independent of any single tab.',
  });
}

// Reuses the same offscreen document as Focus Sounds (see extension/offscreen/offscreen.js)
// rather than opening a second one - Chrome only allows one offscreen document per extension
// anyway, and its audio survives the sidebar/tab closing the same way music playback needs to.
async function playPomodoroSessionCue(kind) {
  try {
    await ensureOffscreenDocument();
    await chrome.runtime.sendMessage({ type: 'OFFSCREEN_SESSION_CUE', payload: { kind } });
  } catch (e) {
    // Best-effort: the badge and any desktop notification already communicated the transition.
  }
}

async function startMusicPlayback(state) {
  const track = resolveTrack(state.categoryId, state.trackId);
  if (!track) return;
  await ensureOffscreenDocument();
  await chrome.runtime.sendMessage({
    type: 'OFFSCREEN_MUSIC_PLAY',
    payload: {
      kind: track.generator ? 'generated' : 'file',
      generator: track.generator || null,
      src: track.src ? chrome.runtime.getURL(track.src) : null,
      volume: state.volume,
    },
  });
}

async function handleMusicGetState() {
  return { ok: true, state: await getMusicState() };
}

async function handleMusicSelect(payload) {
  const state = await getMusicState();
  const categoryId = (payload && MUSIC_LIBRARY[payload.categoryId]) ? payload.categoryId : state.categoryId;
  const category = MUSIC_LIBRARY[categoryId];
  const trackId = category.tracks.some((t) => t.id === (payload && payload.trackId))
    ? payload.trackId
    : category.tracks[0].id;

  const next = { ...state, categoryId, trackId, lastError: null };
  await saveMusicState(next);
  if (next.playing) await startMusicPlayback(next);
  return { ok: true, state: next };
}

async function handleMusicPlay() {
  const state = await getMusicState();
  const next = { ...state, playing: true, lastError: null };
  await saveMusicState(next);
  await startMusicPlayback(next);
  return { ok: true, state: next };
}

async function handleMusicPause() {
  const state = await getMusicState();
  const next = { ...state, playing: false };
  await saveMusicState(next);
  await ensureOffscreenDocument();
  await chrome.runtime.sendMessage({ type: 'OFFSCREEN_MUSIC_PAUSE' });
  return { ok: true, state: next };
}

async function handleMusicSetVolume(payload) {
  const state = await getMusicState();
  const volume = Math.max(0, Math.min(1, Number(payload && payload.volume)));
  const next = { ...state, volume };
  await saveMusicState(next);
  if (next.playing) {
    await ensureOffscreenDocument();
    await chrome.runtime.sendMessage({ type: 'OFFSCREEN_MUSIC_SET_VOLUME', payload: { volume } });
  }
  return { ok: true, state: next };
}

// Sent by the offscreen document itself (see extension/offscreen/offscreen.js), not by the
// sidebar, so there is no response to send back - it just needs to land in storage so any open
// panel picks up the failure via chrome.storage.onChanged.
async function handleMusicPlaybackError(payload) {
  const state = await getMusicState();
  await saveMusicState({ ...state, playing: false, lastError: (payload && payload.message) || 'Playback failed.' });
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
    case 'POMODORO_GET_STATE':
      handlePomodoroGetState().then(sendResponse);
      return true;
    case 'POMODORO_START':
      handlePomodoroStart().then(sendResponse);
      return true;
    case 'POMODORO_PAUSE':
      handlePomodoroPause().then(sendResponse);
      return true;
    case 'POMODORO_RESET':
      handlePomodoroReset().then(sendResponse);
      return true;
    case 'POMODORO_SKIP':
      handlePomodoroSkip().then(sendResponse);
      return true;
    case 'POMODORO_UPDATE_SETTINGS':
      handlePomodoroUpdateSettings(message.payload || {}).then(sendResponse);
      return true;
    case 'MUSIC_GET_STATE':
      handleMusicGetState().then(sendResponse);
      return true;
    case 'MUSIC_SELECT':
      handleMusicSelect(message.payload || {}).then(sendResponse);
      return true;
    case 'MUSIC_PLAY':
      handleMusicPlay().then(sendResponse);
      return true;
    case 'MUSIC_PAUSE':
      handleMusicPause().then(sendResponse);
      return true;
    case 'MUSIC_SET_VOLUME':
      handleMusicSetVolume(message.payload || {}).then(sendResponse);
      return true;
    case 'MUSIC_PLAYBACK_ERROR':
      handleMusicPlaybackError(message.payload || {});
      return undefined;
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
          cursorColor: '#f97316',
          ttsRate: 1,
          ttsPitch: 1,
          voiceURI: null,
          toolbarVisible: true,
          extTheme: 'light',
          uiSoundsEnabled: true,
        },
      });
    }
  });
});
