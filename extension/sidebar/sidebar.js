const DEFAULT_SETTINGS = {
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
};

const els = {
  resetBtn: document.getElementById('resetBtn'),
  hidePanelBtn: document.getElementById('hidePanelBtn'),
  resetHint: document.getElementById('resetHint'),
  backendStatus: document.getElementById('backendStatus'),
  pairCreateBtn: document.getElementById('pairCreateBtn'),
  pairCodeBox: document.getElementById('pairCodeBox'),
  pairCode: document.getElementById('pairCode'),
  pairCopyBtn: document.getElementById('pairCopyBtn'),
  pairExpiry: document.getElementById('pairExpiry'),
  pairStatus: document.getElementById('pairStatus'),
  connectBtn: document.getElementById('connectBtn'),
  savePageBtn: document.getElementById('savePageBtn'),
  saveStatus: document.getElementById('saveStatus'),
  fontPicker: document.getElementById('fontPicker'),
  fontPickerTrigger: document.getElementById('fontPickerTrigger'),
  fontPickerValue: document.getElementById('fontPickerValue'),
  fontPickerList: document.getElementById('fontPickerList'),
  themeGrid: document.getElementById('themeGrid'),
  extThemeGrid: document.getElementById('extThemeGrid'),
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
  toolbarVisible: document.getElementById('toolbarVisible'),
  cursorEnabled: document.getElementById('cursorEnabled'),
  cursorStyle: document.getElementById('cursorStyle'),
  cursorSize: document.getElementById('cursorSize'),
  cursorSizeOut: document.getElementById('cursorSizeOut'),
  cursorSizeDown: document.getElementById('cursorSizeDown'),
  cursorSizeUp: document.getElementById('cursorSizeUp'),
  cursorPalette: document.getElementById('cursorPalette'),
  voiceSelect: document.getElementById('voiceSelect'),
  ttsRate: document.getElementById('ttsRate'),
  ttsRateOut: document.getElementById('ttsRateOut'),
  ttsPitch: document.getElementById('ttsPitch'),
  ttsPitchOut: document.getElementById('ttsPitchOut'),
  toggleReadBtn: document.getElementById('toggleReadBtn'),
  readStatus: document.getElementById('readStatus'),
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

/* Active cards get the filled cut of their icon from the font's FILL axis (CSS). Cards whose
   two states mean genuinely different things — Hide Images is image vs hide_image — name a
   second glyph in data-icon-on and swap the ligature here. */
function setCardState(card, active) {
  card.classList.toggle('active', !!active);
  card.setAttribute('aria-pressed', String(!!active));
  const icon = card.querySelector('.card-icon');
  const name = active ? card.dataset.iconOn : card.dataset.icon;
  if (icon && name) icon.textContent = name;
}

function syncThemeGrid() {
  els.themeGrid.querySelectorAll('.card').forEach((btn) => {
    setCardState(btn, settings.themeMode === btn.dataset.theme);
  });
}

function syncExtThemeGrid() {
  const current = settings.extTheme || 'light';
  document.documentElement.setAttribute('data-ext-theme', current);
  if (els.extThemeGrid) {
    els.extThemeGrid.querySelectorAll('.card').forEach((btn) => {
      const active = btn.dataset.extTheme === current;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }
}

function syncFeatureCards() {
  setCardState(els.highlightLinksCard, settings.highlightLinks);
  setCardState(els.hideImagesCard, settings.hideImages);
  setCardState(els.pauseAnimationsCard, settings.pauseAnimations);
  setCardState(els.declutterCard, settings.declutter);
}

/* ---------- Cursor colour palette ----------
   A radiogroup of preset swatches replaces the native colour input; the same palette
   colours the arrow, ring, dot and crosshair cursors. */
const swatches = Array.from(els.cursorPalette.querySelectorAll('.swatch'));

function syncPalette() {
  const current = String(settings.cursorColor || DEFAULT_SETTINGS.cursorColor).toLowerCase();
  let checkedIndex = swatches.findIndex((s) => s.dataset.color.toLowerCase() === current);
  if (checkedIndex === -1) checkedIndex = 0;
  swatches.forEach((s, i) => {
    s.setAttribute('aria-checked', String(i === checkedIndex));
    s.tabIndex = i === checkedIndex ? 0 : -1;
  });
}

function chooseSwatch(index, { focus = false } = {}) {
  const i = clamp(index, 0, swatches.length - 1);
  persist({ cursorColor: swatches[i].dataset.color });
  syncPalette();
  if (focus) swatches[i].focus();
}

function wirePalette() {
  swatches.forEach((swatch, index) => {
    swatch.addEventListener('click', () => chooseSwatch(index));
    swatch.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (step) {
        e.preventDefault();
        const next = (index + step + swatches.length) % swatches.length;
        chooseSwatch(next, { focus: true });
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        chooseSwatch(e.key === 'Home' ? 0 : swatches.length - 1, { focus: true });
      }
    });
  });
}

/* ---------- Font picker ----------
   A listbox instead of a native <select> so every choice can be rendered in the
   typeface it applies, which a <select>'s option list cannot do reliably. */
const fontOptions = Array.from(els.fontPickerList.querySelectorAll('.fontpicker-option'));
let fontListOpen = false;
let activeFontIndex = 0;

function fontOptionClass(optionEl) {
  return Array.from(optionEl.classList).find((c) => c.startsWith('font-')) || '';
}

function syncFontPicker() {
  const value = settings.dyslexiaFont || 'none';
  const selected = fontOptions.find((o) => o.dataset.value === value) || fontOptions[0];

  fontOptions.forEach((o) => o.setAttribute('aria-selected', String(o === selected)));

  els.fontPickerValue.textContent = selected.querySelector('.fontpicker-name').textContent;
  els.fontPickerValue.className = `fontpicker-value ${fontOptionClass(selected)}`.trim();
  activeFontIndex = fontOptions.indexOf(selected);
}

function setActiveFontOption(index) {
  activeFontIndex = clamp(index, 0, fontOptions.length - 1);
  fontOptions.forEach((o, i) => o.classList.toggle('is-active', i === activeFontIndex));
  const active = fontOptions[activeFontIndex];
  els.fontPickerList.setAttribute('aria-activedescendant', active.id);
  active.scrollIntoView({ block: 'nearest' });
}

function openFontList() {
  if (fontListOpen) return;
  fontListOpen = true;
  els.fontPickerList.hidden = false;
  els.fontPickerTrigger.setAttribute('aria-expanded', 'true');
  setActiveFontOption(fontOptions.findIndex((o) => o.getAttribute('aria-selected') === 'true'));
  els.fontPickerList.focus();
}

function closeFontList({ refocus = true } = {}) {
  if (!fontListOpen) return;
  fontListOpen = false;
  els.fontPickerList.hidden = true;
  els.fontPickerList.removeAttribute('aria-activedescendant');
  els.fontPickerTrigger.setAttribute('aria-expanded', 'false');
  fontOptions.forEach((o) => o.classList.remove('is-active'));
  if (refocus) els.fontPickerTrigger.focus();
}

function chooseFont(index) {
  const option = fontOptions[clamp(index, 0, fontOptions.length - 1)];
  persist({ dyslexiaFont: option.dataset.value });
  syncFontPicker();
  closeFontList();
}

function wireFontPicker() {
  els.fontPickerTrigger.addEventListener('click', () => {
    if (fontListOpen) closeFontList();
    else openFontList();
  });

  els.fontPickerTrigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openFontList();
    }
  });

  els.fontPickerList.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveFontOption(activeFontIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveFontOption(activeFontIndex - 1);
        break;
      case 'Home':
        e.preventDefault();
        setActiveFontOption(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveFontOption(fontOptions.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        chooseFont(activeFontIndex);
        break;
      case 'Escape':
        // Escape closes the list only; the panel-level Escape handler must not also fire.
        e.stopPropagation();
        closeFontList();
        break;
      case 'Tab':
        closeFontList();
        break;
      default:
        break;
    }
  });

  // Keep keyboard focus on the list itself so clicking an option never closes it early.
  els.fontPickerList.addEventListener('mousedown', (e) => e.preventDefault());

  fontOptions.forEach((option, index) => {
    option.addEventListener('click', () => chooseFont(index));
    option.addEventListener('mousemove', () => setActiveFontOption(index));
  });

  document.addEventListener('click', (e) => {
    if (fontListOpen && !els.fontPicker.contains(e.target)) closeFontList({ refocus: false });
  });
}

function populateUI() {
  syncFontPicker();
  syncThemeGrid();
  syncExtThemeGrid();
  syncFeatureCards();

  els.fontScale.value = settings.fontScale;
  els.fontScaleOut.textContent = `${settings.fontScale}%`;

  els.letterSpacing.value = settings.letterSpacing || 0;
  els.letterSpacingOut.textContent = settings.letterSpacing ? `${Number(settings.letterSpacing).toFixed(2)}em` : 'Default';

  els.lineHeight.value = settings.lineHeight || 1.8;
  els.lineHeightOut.textContent = settings.lineHeight ? String(settings.lineHeight) : 'Default';

  els.bionicReading.checked = !!settings.bionicReading;
  els.toolbarVisible.checked = settings.toolbarVisible !== false;

  els.cursorEnabled.checked = !!settings.cursorEnabled;
  els.cursorStyle.value = settings.cursorStyle || DEFAULT_SETTINGS.cursorStyle;
  els.cursorSize.value = settings.cursorSize || 32;
  els.cursorSizeOut.textContent = `${settings.cursorSize || 32}px`;
  syncPalette();

  els.ttsRate.value = settings.ttsRate;
  els.ttsRateOut.textContent = `${settings.ttsRate.toFixed(1)}x`;
  els.ttsPitch.value = settings.ttsPitch;
  els.ttsPitchOut.textContent = settings.ttsPitch.toFixed(1);
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
  // Only an authenticated session can mint a pairing code.
  els.pairCreateBtn.disabled = !connected;
  if (!connected) hidePairCode();
  return connected;
}

/* Pairing. This extension is the code GENERATOR: it holds the authenticated session, so
   it is the only client that can mint a code. The dashboard is where a code gets entered.
   A code links that second client to the same anonymous user so both see one saved-page
   library; nothing is copied between devices. Codes live 10 minutes, are single-use, and
   creating a new one invalidates the previous unused one. */

let pairExpiryTimer = null;

function stopPairExpiryTimer() {
  if (pairExpiryTimer !== null) {
    clearInterval(pairExpiryTimer);
    pairExpiryTimer = null;
  }
}

function hidePairCode() {
  stopPairExpiryTimer();
  els.pairCodeBox.hidden = true;
  els.pairCode.textContent = '';
  els.pairExpiry.textContent = '';
}

function showPairCode(code, expiresAt) {
  els.pairCode.textContent = code;
  els.pairCodeBox.hidden = false;

  const deadline = new Date(expiresAt).getTime();
  const tick = () => {
    const left = Math.round((deadline - Date.now()) / 1000);
    if (left <= 0) {
      // The backend would reject it anyway; clearing it avoids reading out a dead code.
      hidePairCode();
      els.pairStatus.textContent = 'That code expired. Generate a new one.';
      return;
    }
    const mins = Math.floor(left / 60);
    const secs = String(left % 60).padStart(2, '0');
    els.pairExpiry.textContent = `Expires in ${mins}:${secs}`;
  };
  tick();
  stopPairExpiryTimer();
  pairExpiryTimer = setInterval(tick, 1000);
}

function wirePairingEvents() {
  els.pairCreateBtn.addEventListener('click', async () => {
    els.pairCreateBtn.disabled = true;
    els.pairStatus.textContent = 'Requesting a code...';
    const res = await chrome.runtime.sendMessage({ type: 'BACKEND_CREATE_PAIRING_CODE' });
    els.pairCreateBtn.disabled = false;

    if (res && res.ok) {
      showPairCode(res.code, res.expiresAt);
      els.pairStatus.textContent = 'Enter this code on the dashboard within 10 minutes.';
    } else {
      hidePairCode();
      els.pairStatus.textContent =
        (res && res.error) === 'pairing_rate_limited'
          ? 'Too many codes requested. Try again later.'
          : `Could not get a code (${(res && res.error) || 'unknown'}).`;
    }
  });

  els.pairCopyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(els.pairCode.textContent);
      els.pairStatus.textContent = 'Code copied.';
    } catch (e) {
      // Clipboard access can be denied inside the overlay iframe; the code is on screen.
      els.pairStatus.textContent = 'Could not copy - read the code off the screen instead.';
    }
  });
}

/* The panel runs as an overlay iframe inside the page (see content/panel.js), so hiding it
   is a message to the host frame rather than a window close. */
function hidePanel() {
  if (window.parent !== window) window.parent.postMessage({ type: 'A11Y_PANEL_CLOSE' }, '*');
}

function wireEvents() {
  wireFontPicker();

  els.hidePanelBtn.addEventListener('click', hidePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !fontListOpen) hidePanel();
  });

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

  els.toolbarVisible.addEventListener('change', () => persist({ toolbarVisible: els.toolbarVisible.checked }));

  els.cursorEnabled.addEventListener('change', () => persist({ cursorEnabled: els.cursorEnabled.checked }));
  els.cursorStyle.addEventListener('change', () => persist({ cursorStyle: els.cursorStyle.value }));
  wirePalette();
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

  els.toggleReadBtn.addEventListener('click', async () => {
    try {
      await sendToContent({ type: 'TOGGLE_READ' });
      els.readStatus.textContent = '';
    } catch (e) {
      els.readStatus.textContent = 'Cannot control this page (try a regular website tab).';
    }
  });

  if (els.extThemeGrid) {
    els.extThemeGrid.querySelectorAll('.card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.extTheme;
        persist({ extTheme: theme });
        syncExtThemeGrid();
      });
    });
  }

  const handleReset = async () => {
    settings = { ...DEFAULT_SETTINGS };
    await chrome.storage.local.set({ a11ySettings: settings });
    populateUI();
    try {
      await sendToContent({ type: 'RESET_SESSION' });
    } catch (e) {
      // content script may not be loaded on internal pages
    }
    els.resetHint.textContent = 'All settings have been reset to defaults.';
    els.resetHint.style.color = 'var(--color-accent)';
    setTimeout(() => {
      els.resetHint.textContent = 'Changes are saved as you make them.';
      els.resetHint.style.removeProperty('color');
    }, 2500);
  };

  if (els.resetBtn) els.resetBtn.addEventListener('click', handleReset);
}

async function init() {
  const stored = await chrome.storage.local.get(['a11ySettings']);
  settings = { ...DEFAULT_SETTINGS, ...(stored.a11ySettings || {}) };

  // The master on/off control is gone, and content/toolbar.js hides the on-page button
  // while the extension is off - so anyone whose stored state is already off would have
  // no way back on. Heal it here rather than strand them.
  if (settings.extensionEnabled === false) {
    persist({ extensionEnabled: true });
  }

  populateUI();
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
  wireEvents();
  wireBackendEvents();
  wirePairingEvents();
  refreshBackendStatus();
}

init();
