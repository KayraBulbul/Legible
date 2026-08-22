const DEFAULT_SETTINGS = {
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
};

const els = {
  backendStatus: document.getElementById('backendStatus'),
  connectBtn: document.getElementById('connectBtn'),
  savePageBtn: document.getElementById('savePageBtn'),
  saveStatus: document.getElementById('saveStatus'),
  dyslexiaFont: document.getElementById('dyslexiaFont'),
  themeGrid: document.getElementById('themeGrid'),
  fontScale: document.getElementById('fontScale'),
  fontScaleOut: document.getElementById('fontScaleOut'),
  fontScaleDown: document.getElementById('fontScaleDown'),
  fontScaleUp: document.getElementById('fontScaleUp'),
  letterSpacing: document.getElementById('letterSpacing'),
  letterSpacingOut: document.getElementById('letterSpacingOut'),
  letterSpacingDown: document.getElementById('letterSpacingDown'),
  letterSpacingUp: document.getElementById('letterSpacingUp'),
  lineHeight: document.getElementById('lineHeight'),
  lineHeightOut: document.getElementById('lineHeightOut'),
  lineHeightDown: document.getElementById('lineHeightDown'),
  lineHeightUp: document.getElementById('lineHeightUp'),
  bionicReading: document.getElementById('bionicReading'),
  highlightLinksCard: document.getElementById('highlightLinksCard'),
  hideImagesCard: document.getElementById('hideImagesCard'),
  pauseAnimationsCard: document.getElementById('pauseAnimationsCard'),
  declutterCard: document.getElementById('declutterCard'),
  hudVisible: document.getElementById('hudVisible'),
  cursorEnabled: document.getElementById('cursorEnabled'),
  cursorStyle: document.getElementById('cursorStyle'),
  cursorSize: document.getElementById('cursorSize'),
  cursorSizeOut: document.getElementById('cursorSizeOut'),
  cursorSizeDown: document.getElementById('cursorSizeDown'),
  cursorSizeUp: document.getElementById('cursorSizeUp'),
  cursorColor: document.getElementById('cursorColor'),
  voiceSelect: document.getElementById('voiceSelect'),
  ttsRate: document.getElementById('ttsRate'),
  ttsRateOut: document.getElementById('ttsRateOut'),
  ttsPitch: document.getElementById('ttsPitch'),
  ttsPitchOut: document.getElementById('ttsPitchOut'),
  toggleReadBtn: document.getElementById('toggleReadBtn'),
  aiEnabled: document.getElementById('aiEnabled'),
  scanBtn: document.getElementById('scanBtn'),
  scanStatus: document.getElementById('scanStatus'),
  resetBtn: document.getElementById('resetBtn'),
};

let settings = { ...DEFAULT_SETTINGS };

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function decimalsOf(step) {
  const s = String(step);
  const i = s.indexOf('.');
  return i === -1 ? 0 : s.length - i - 1;
}

function syncThemeGrid() {
  els.themeGrid.querySelectorAll('.card').forEach((btn) => {
    btn.classList.toggle('active', settings.themeMode === btn.dataset.theme);
  });
}

function syncFeatureCards() {
  els.highlightLinksCard.classList.toggle('active', !!settings.highlightLinks);
  els.hideImagesCard.classList.toggle('active', !!settings.hideImages);
  els.pauseAnimationsCard.classList.toggle('active', !!settings.pauseAnimations);
  els.declutterCard.classList.toggle('active', !!settings.declutter);
}

function populateUI() {
  els.dyslexiaFont.value = settings.dyslexiaFont;
  syncThemeGrid();
  syncFeatureCards();

  els.fontScale.value = settings.fontScale;
  els.fontScaleOut.textContent = `${settings.fontScale}%`;

  els.letterSpacing.value = settings.letterSpacing || 0;
  els.letterSpacingOut.textContent = settings.letterSpacing ? `${Number(settings.letterSpacing).toFixed(2)}em` : 'Default';

  els.lineHeight.value = settings.lineHeight || 1.8;
  els.lineHeightOut.textContent = settings.lineHeight ? String(settings.lineHeight) : 'Default';

  els.bionicReading.checked = !!settings.bionicReading;
  els.hudVisible.checked = settings.hudVisible !== false;

  els.cursorEnabled.checked = !!settings.cursorEnabled;
  els.cursorStyle.value = settings.cursorStyle || 'ring';
  els.cursorSize.value = settings.cursorSize || 32;
  els.cursorSizeOut.textContent = `${settings.cursorSize || 32}px`;
  els.cursorColor.value = settings.cursorColor || '#5b3cdc';

  els.ttsRate.value = settings.ttsRate;
  els.ttsRateOut.textContent = `${settings.ttsRate.toFixed(1)}x`;
  els.ttsPitch.value = settings.ttsPitch;
  els.ttsPitchOut.textContent = settings.ttsPitch.toFixed(1);
  els.aiEnabled.checked = settings.aiEnabled !== false;
  if (settings.voiceURI) els.voiceSelect.value = settings.voiceURI;
}

function persist(partial) {
  settings = { ...settings, ...partial };
  chrome.storage.local.set({ a11ySettings: settings });
}

function loadVoices() {
  const voices = window.speechSynthesis.getVoices();
  const current = els.voiceSelect.value;
  els.voiceSelect.innerHTML = '<option value="">System default</option>';
  voices.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v.voiceURI;
    opt.textContent = `${v.name} (${v.lang})`;
    els.voiceSelect.appendChild(opt);
  });
  if (settings.voiceURI) els.voiceSelect.value = settings.voiceURI;
  else if (current) els.voiceSelect.value = current;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToContent(message) {
  const tab = await getActiveTab();
  if (!tab || !tab.id) throw new Error('No active tab');
  return chrome.tabs.sendMessage(tab.id, message);
}

function wireStepper({ rangeEl, downBtn, upBtn, step, key, format }) {
  const decimals = decimalsOf(step);
  const min = Number(rangeEl.min);
  const max = Number(rangeEl.max);

  function commit(rawVal) {
    const val = Number(Number(rawVal).toFixed(decimals));
    rangeEl.value = val;
    if (format) format(val);
    persist({ [key]: val });
  }

  rangeEl.addEventListener('input', () => commit(rangeEl.value));
  downBtn.addEventListener('click', () => commit(clamp(Number(rangeEl.value) - step, min, max)));
  upBtn.addEventListener('click', () => commit(clamp(Number(rangeEl.value) + step, min, max)));
}

async function refreshBackendStatus() {
  const res = await chrome.runtime.sendMessage({ type: 'BACKEND_STATUS' });
  const connected = !!(res && res.ok && res.connected);
  els.backendStatus.textContent = connected ? 'Connected' : 'Not connected';
  els.backendStatus.className = connected ? 'status-text ok' : 'status-text';
  els.savePageBtn.disabled = !connected;
  return connected;
}

function wireBackendEvents() {
  els.connectBtn.addEventListener('click', async () => {
    els.connectBtn.disabled = true;
    els.backendStatus.textContent = 'Connecting...';
    els.backendStatus.className = 'status-text';
    const res = await chrome.runtime.sendMessage({ type: 'BACKEND_CONNECT' });
    els.connectBtn.disabled = false;
    if (res && res.ok) {
      await refreshBackendStatus();
    } else {
      els.backendStatus.textContent = `Connect failed (${(res && res.error) || 'unknown'}).`;
      els.backendStatus.className = 'status-text err';
    }
  });

  els.savePageBtn.addEventListener('click', async () => {
    els.savePageBtn.disabled = true;
    els.saveStatus.textContent = 'Extracting page...';
    try {
      const extraction = await sendToContent({ type: 'EXTRACT_PAGE' });
      if (!extraction || !extraction.ok) throw new Error('extract-failed');

      els.saveStatus.textContent = 'Saving...';
      const res = await chrome.runtime.sendMessage({
        type: 'BACKEND_SAVE_PAGE',
        payload: {
          title: extraction.title,
          originalUrl: extraction.originalUrl,
          sourceDocument: extraction.sourceDocument,
          a11ySettings: settings,
        },
      });

      els.saveStatus.textContent = res && res.ok ? 'Saved.' : `Save failed (${(res && res.error) || 'unknown'}).`;
    } catch (e) {
      els.saveStatus.textContent = 'Cannot save this page (try a regular website tab).';
    } finally {
      els.savePageBtn.disabled = !(await refreshBackendStatus());
    }
  });
}

function wireEvents() {
  els.dyslexiaFont.addEventListener('change', () => persist({ dyslexiaFont: els.dyslexiaFont.value }));

  els.themeGrid.querySelectorAll('.card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.theme;
      persist({ themeMode: settings.themeMode === val ? 'none' : val });
      syncThemeGrid();
    });
  });

  wireStepper({
    rangeEl: els.fontScale,
    downBtn: els.fontScaleDown,
    upBtn: els.fontScaleUp,
    step: 5,
    key: 'fontScale',
    format: (val) => { els.fontScaleOut.textContent = `${val}%`; },
  });

  wireStepper({
    rangeEl: els.letterSpacing,
    downBtn: els.letterSpacingDown,
    upBtn: els.letterSpacingUp,
    step: 0.01,
    key: 'letterSpacing',
    format: (val) => { els.letterSpacingOut.textContent = val ? `${val.toFixed(2)}em` : 'Default'; },
  });

  wireStepper({
    rangeEl: els.lineHeight,
    downBtn: els.lineHeightDown,
    upBtn: els.lineHeightUp,
    step: 0.1,
    key: 'lineHeight',
    format: (val) => { els.lineHeightOut.textContent = String(val); },
  });

  els.bionicReading.addEventListener('change', () => persist({ bionicReading: els.bionicReading.checked }));

  els.highlightLinksCard.addEventListener('click', () => {
    persist({ highlightLinks: !settings.highlightLinks });
    syncFeatureCards();
  });
  els.hideImagesCard.addEventListener('click', () => {
    persist({ hideImages: !settings.hideImages });
    syncFeatureCards();
  });
  els.pauseAnimationsCard.addEventListener('click', () => {
    persist({ pauseAnimations: !settings.pauseAnimations });
    syncFeatureCards();
  });
  els.declutterCard.addEventListener('click', () => {
    persist({ declutter: !settings.declutter });
    syncFeatureCards();
  });

  els.hudVisible.addEventListener('change', () => persist({ hudVisible: els.hudVisible.checked }));

  els.cursorEnabled.addEventListener('change', () => persist({ cursorEnabled: els.cursorEnabled.checked }));
  els.cursorStyle.addEventListener('change', () => persist({ cursorStyle: els.cursorStyle.value }));
  els.cursorColor.addEventListener('input', () => persist({ cursorColor: els.cursorColor.value }));
  wireStepper({
    rangeEl: els.cursorSize,
    downBtn: els.cursorSizeDown,
    upBtn: els.cursorSizeUp,
    step: 2,
    key: 'cursorSize',
    format: (val) => { els.cursorSizeOut.textContent = `${val}px`; },
  });

  els.voiceSelect.addEventListener('change', () => persist({ voiceURI: els.voiceSelect.value || null }));
  els.ttsRate.addEventListener('input', () => {
    els.ttsRateOut.textContent = `${Number(els.ttsRate.value).toFixed(1)}x`;
    persist({ ttsRate: Number(els.ttsRate.value) });
  });
  els.ttsPitch.addEventListener('input', () => {
    els.ttsPitchOut.textContent = Number(els.ttsPitch.value).toFixed(1);
    persist({ ttsPitch: Number(els.ttsPitch.value) });
  });
  els.aiEnabled.addEventListener('change', () => persist({ aiEnabled: els.aiEnabled.checked }));

  els.toggleReadBtn.addEventListener('click', async () => {
    try {
      await sendToContent({ type: 'TOGGLE_READ' });
    } catch (e) {
      els.scanStatus.textContent = 'Cannot control this page (try a regular website tab).';
    }
  });

  els.scanBtn.addEventListener('click', async () => {
    els.scanStatus.textContent = 'Scanning...';
    try {
      const res = await sendToContent({ type: 'RUN_AI_SCAN' });
      if (res && res.ok) {
        els.scanStatus.textContent = `Analyzed ${res.result.scanned} element(s).`;
      } else {
        els.scanStatus.textContent = 'Scan failed.';
      }
    } catch (e) {
      els.scanStatus.textContent = 'Cannot scan this page (try a regular website tab).';
    }
  });

  els.resetBtn.addEventListener('click', () => {
    settings = { ...DEFAULT_SETTINGS };
    chrome.storage.local.set({ a11ySettings: settings });
    populateUI();
  });
}

async function init() {
  const stored = await chrome.storage.local.get(['a11ySettings']);
  settings = { ...DEFAULT_SETTINGS, ...(stored.a11ySettings || {}) };
  populateUI();
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
  wireEvents();
  wireBackendEvents();
  refreshBackendStatus();
}

init();
