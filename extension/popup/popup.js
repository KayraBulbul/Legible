const DEFAULT_SETTINGS = {
  dyslexiaFont: 'none',
  contrastMode: 'none',
  declutter: false,
  bionicReading: false,
  fontScale: 100,
  lineHeight: null,
  ttsRate: 1,
  ttsPitch: 1,
  voiceURI: null,
  hudVisible: true,
  aiEnabled: true,
};

const els = {
  dyslexiaFont: document.getElementById('dyslexiaFont'),
  fontScale: document.getElementById('fontScale'),
  fontScaleOut: document.getElementById('fontScaleOut'),
  lineHeight: document.getElementById('lineHeight'),
  lineHeightOut: document.getElementById('lineHeightOut'),
  bionicReading: document.getElementById('bionicReading'),
  contrastMode: document.getElementById('contrastMode'),
  declutter: document.getElementById('declutter'),
  hudVisible: document.getElementById('hudVisible'),
  voiceSelect: document.getElementById('voiceSelect'),
  ttsRate: document.getElementById('ttsRate'),
  ttsRateOut: document.getElementById('ttsRateOut'),
  ttsPitch: document.getElementById('ttsPitch'),
  ttsPitchOut: document.getElementById('ttsPitchOut'),
  toggleReadBtn: document.getElementById('toggleReadBtn'),
  apiKey: document.getElementById('apiKey'),
  saveKeyBtn: document.getElementById('saveKeyBtn'),
  keyStatus: document.getElementById('keyStatus'),
  aiEnabled: document.getElementById('aiEnabled'),
  scanBtn: document.getElementById('scanBtn'),
  scanStatus: document.getElementById('scanStatus'),
  resetBtn: document.getElementById('resetBtn'),
};

let settings = { ...DEFAULT_SETTINGS };

function populateUI() {
  els.dyslexiaFont.value = settings.dyslexiaFont;
  els.fontScale.value = settings.fontScale;
  els.fontScaleOut.textContent = `${settings.fontScale}%`;
  els.lineHeight.value = settings.lineHeight || 1.8;
  els.lineHeightOut.textContent = settings.lineHeight ? String(settings.lineHeight) : 'Default';
  els.bionicReading.checked = !!settings.bionicReading;
  els.contrastMode.value = settings.contrastMode;
  els.declutter.checked = !!settings.declutter;
  els.hudVisible.checked = settings.hudVisible !== false;
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

function wireEvents() {
  els.dyslexiaFont.addEventListener('change', () => persist({ dyslexiaFont: els.dyslexiaFont.value }));
  els.fontScale.addEventListener('input', () => {
    els.fontScaleOut.textContent = `${els.fontScale.value}%`;
    persist({ fontScale: Number(els.fontScale.value) });
  });
  els.lineHeight.addEventListener('input', () => {
    els.lineHeightOut.textContent = els.lineHeight.value;
    persist({ lineHeight: Number(els.lineHeight.value) });
  });
  els.bionicReading.addEventListener('change', () => persist({ bionicReading: els.bionicReading.checked }));
  els.contrastMode.addEventListener('change', () => persist({ contrastMode: els.contrastMode.value }));
  els.declutter.addEventListener('change', () => persist({ declutter: els.declutter.checked }));
  els.hudVisible.addEventListener('change', () => persist({ hudVisible: els.hudVisible.checked }));
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

  els.saveKeyBtn.addEventListener('click', async () => {
    const key = els.apiKey.value.trim();
    if (!key) {
      els.keyStatus.textContent = 'Enter a key first.';
      els.keyStatus.className = 'status-text err';
      return;
    }
    await chrome.storage.local.set({ geminiApiKey: key });
    els.keyStatus.textContent = 'Saved.';
    els.keyStatus.className = 'status-text ok';
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
  const stored = await chrome.storage.local.get(['a11ySettings', 'geminiApiKey']);
  settings = { ...DEFAULT_SETTINGS, ...(stored.a11ySettings || {}) };
  if (stored.geminiApiKey) {
    els.apiKey.placeholder = 'Key saved (hidden)';
  }
  populateUI();
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
  wireEvents();
}

init();
