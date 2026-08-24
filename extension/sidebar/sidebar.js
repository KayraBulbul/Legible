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
  cursorColor: '#f97316',
  ttsRate: 1,
  ttsPitch: 1,
  voiceURI: null,
  toolbarVisible: true,
  extTheme: 'light',
  panelFont: 'default',
  // Linked devices is collapsed by default: pairing is a once-per-device errand, and the
  // panel is only 372px wide, so it should not cost the reading controls any height.
  pairingOpen: false,
  uiSoundsEnabled: true,
};

const els = {
  resetBtn: document.getElementById('resetBtn'),
  resetAllBtn: document.getElementById('resetAllBtn'),
  hidePanelBtn: document.getElementById('hidePanelBtn'),
  powerHint: document.getElementById('powerHint'),
  backendStatus: document.getElementById('backendStatus'),
  connectIcon: document.getElementById('connectIcon'),
  connectLabel: document.getElementById('connectLabel'),
  savePageIcon: document.getElementById('savePageIcon'),
  savePageLabel: document.getElementById('savePageLabel'),
  pairCreateBtn: document.getElementById('pairCreateBtn'),
  pairCodeBox: document.getElementById('pairCodeBox'),
  pairCode: document.getElementById('pairCode'),
  pairCopyBtn: document.getElementById('pairCopyBtn'),
  pairExpiry: document.getElementById('pairExpiry'),
  pairExpiryBar: document.getElementById('pairExpiryBar'),
  pairCodeInput: document.getElementById('pairCodeInput'),
  pairRedeemBtn: document.getElementById('pairRedeemBtn'),
  pairStatus: document.getElementById('pairStatus'),
  pairConfirmDialog: document.getElementById('pairConfirmDialog'),
  pairingToggle: document.getElementById('pairingToggle'),
  pairingBody: document.getElementById('pairingBody'),
  pairingBadge: document.getElementById('pairingBadge'),
  connectBtn: document.getElementById('connectBtn'),
  savePageBtn: document.getElementById('savePageBtn'),
  saveStatus: document.getElementById('saveStatus'),
  fontPicker: document.getElementById('fontPicker'),
  fontPickerTrigger: document.getElementById('fontPickerTrigger'),
  fontPickerValue: document.getElementById('fontPickerValue'),
  fontPickerList: document.getElementById('fontPickerList'),
  themeGrid: document.getElementById('themeGrid'),
  extThemeGrid: document.getElementById('extThemeGrid'),
  panelFontPicker: document.getElementById('panelFontPicker'),
  panelFontPickerTrigger: document.getElementById('panelFontPickerTrigger'),
  panelFontPickerValue: document.getElementById('panelFontPickerValue'),
  panelFontPickerList: document.getElementById('panelFontPickerList'),
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
  uiSoundsEnabled: document.getElementById('uiSoundsEnabled'),
  cursorEnabled: document.getElementById('cursorEnabled'),
  cursorStylePicker: document.getElementById('cursorStylePicker'),
  cursorStyleTrigger: document.getElementById('cursorStyleTrigger'),
  cursorStyleValueIcon: document.getElementById('cursorStyleValueIcon'),
  cursorStyleValue: document.getElementById('cursorStyleValue'),
  cursorStyleList: document.getElementById('cursorStyleList'),
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
  pomodoroModeLabel: document.getElementById('pomodoroModeLabel'),
  pomodoroTime: document.getElementById('pomodoroTime'),
  pomodoroRingProgress: document.getElementById('pomodoroRingProgress'),
  pomodoroCycleLabel: document.getElementById('pomodoroCycleLabel'),
  pomodoroStartBtn: document.getElementById('pomodoroStartBtn'),
  pomodoroStartIcon: document.getElementById('pomodoroStartIcon'),
  pomodoroStartLabel: document.getElementById('pomodoroStartLabel'),
  pomodoroResetBtn: document.getElementById('pomodoroResetBtn'),
  pomodoroSkipBtn: document.getElementById('pomodoroSkipBtn'),
  pomodoroSettingsToggle: document.getElementById('pomodoroSettingsToggle'),
  pomodoroSettingsBody: document.getElementById('pomodoroSettingsBody'),
  pomodoroWork: document.getElementById('pomodoroWork'),
  pomodoroWorkOut: document.getElementById('pomodoroWorkOut'),
  pomodoroWorkDown: document.getElementById('pomodoroWorkDown'),
  pomodoroWorkUp: document.getElementById('pomodoroWorkUp'),
  pomodoroShortBreak: document.getElementById('pomodoroShortBreak'),
  pomodoroShortBreakOut: document.getElementById('pomodoroShortBreakOut'),
  pomodoroShortBreakDown: document.getElementById('pomodoroShortBreakDown'),
  pomodoroShortBreakUp: document.getElementById('pomodoroShortBreakUp'),
  pomodoroAutoStart: document.getElementById('pomodoroAutoStart'),
  pomodoroNotify: document.getElementById('pomodoroNotify'),
  musicCategoryGrid: document.getElementById('musicCategoryGrid'),
  musicTrackField: document.getElementById('musicTrackField'),
  musicTrackPicker: document.getElementById('musicTrackPicker'),
  musicTrackTrigger: document.getElementById('musicTrackTrigger'),
  musicTrackValueIcon: document.getElementById('musicTrackValueIcon'),
  musicTrackValue: document.getElementById('musicTrackValue'),
  musicTrackList: document.getElementById('musicTrackList'),
  musicVolume: document.getElementById('musicVolume'),
  musicVolumeOut: document.getElementById('musicVolumeOut'),
  musicStatus: document.getElementById('musicStatus'),
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

/* ---------- Cursor style picker ----------
   A listbox instead of a native <select>, reusing the same trackpicker markup/classes as the
   Focus Sounds track picker below, so each cursor shape can show the icon that represents it -
   a native <option> can only ever show plain text. */
const cursorStyleOptions = Array.from(els.cursorStyleList.querySelectorAll('.trackpicker-option'));
let cursorStyleListOpen = false;
let activeCursorStyleIndex = 0;

function syncCursorStylePicker() {
  const value = settings.cursorStyle || DEFAULT_SETTINGS.cursorStyle;
  const selected = cursorStyleOptions.find((o) => o.dataset.value === value) || cursorStyleOptions[0];

  cursorStyleOptions.forEach((o) => o.setAttribute('aria-selected', String(o === selected)));

  els.cursorStyleValueIcon.textContent = selected.querySelector('.trackpicker-option-icon').textContent;
  els.cursorStyleValue.textContent = selected.querySelector('.trackpicker-name').textContent;
  activeCursorStyleIndex = cursorStyleOptions.indexOf(selected);
}

function setActiveCursorStyleOption(index) {
  activeCursorStyleIndex = clamp(index, 0, cursorStyleOptions.length - 1);
  cursorStyleOptions.forEach((o, i) => o.classList.toggle('is-active', i === activeCursorStyleIndex));
  const active = cursorStyleOptions[activeCursorStyleIndex];
  els.cursorStyleList.setAttribute('aria-activedescendant', active.id);
  active.scrollIntoView({ block: 'nearest' });
}

function openCursorStyleList() {
  if (cursorStyleListOpen) return;
  cursorStyleListOpen = true;
  els.cursorStyleList.hidden = false;
  els.cursorStyleTrigger.setAttribute('aria-expanded', 'true');
  setActiveCursorStyleOption(cursorStyleOptions.findIndex((o) => o.getAttribute('aria-selected') === 'true'));
  els.cursorStyleList.focus();
}

function closeCursorStyleList({ refocus = true } = {}) {
  if (!cursorStyleListOpen) return;
  cursorStyleListOpen = false;
  els.cursorStyleList.hidden = true;
  els.cursorStyleList.removeAttribute('aria-activedescendant');
  els.cursorStyleTrigger.setAttribute('aria-expanded', 'false');
  cursorStyleOptions.forEach((o) => o.classList.remove('is-active'));
  if (refocus) els.cursorStyleTrigger.focus();
}

function chooseCursorStyle(index) {
  const option = cursorStyleOptions[clamp(index, 0, cursorStyleOptions.length - 1)];
  persist({ cursorStyle: option.dataset.value });
  syncCursorStylePicker();
  closeCursorStyleList();
}

function wireCursorStylePicker() {
  els.cursorStyleTrigger.addEventListener('click', () => {
    if (cursorStyleListOpen) closeCursorStyleList();
    else openCursorStyleList();
  });

  els.cursorStyleTrigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openCursorStyleList();
    }
  });

  els.cursorStyleList.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveCursorStyleOption(activeCursorStyleIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveCursorStyleOption(activeCursorStyleIndex - 1);
        break;
      case 'Home':
        e.preventDefault();
        setActiveCursorStyleOption(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveCursorStyleOption(cursorStyleOptions.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        chooseCursorStyle(activeCursorStyleIndex);
        break;
      case 'Escape':
        // Escape closes the list only; the panel-level Escape handler must not also fire.
        e.stopPropagation();
        closeCursorStyleList();
        break;
      case 'Tab':
        closeCursorStyleList();
        break;
      default:
        break;
    }
  });

  // Keep keyboard focus on the list itself so clicking an option never closes it early.
  els.cursorStyleList.addEventListener('mousedown', (e) => e.preventDefault());

  cursorStyleOptions.forEach((option, index) => {
    option.addEventListener('click', () => chooseCursorStyle(index));
    option.addEventListener('mousemove', () => setActiveCursorStyleOption(index));
  });

  document.addEventListener('click', (e) => {
    if (cursorStyleListOpen && !els.cursorStylePicker.contains(e.target)) closeCursorStyleList({ refocus: false });
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

/* ---------- Panel font picker ----------
   Same listbox pattern and the same font choices as the dyslexia font picker above, but this
   one changes the typeface of the extension's own interface (this panel), not the visited
   page - so instead of messaging the content script it just sets a CSS custom property read
   by body's font-family (see sidebar.css). */
const PANEL_FONT_STACKS = {
  lexend: "'A11y Lexend', Verdana, sans-serif",
  opendyslexic: "'A11y OpenDyslexic', 'Comic Sans MS', sans-serif",
  atkinson: "'Atkinson Hyperlegible', Arial, sans-serif",
  opensans: "'Open Sans', 'Segoe UI', Roboto, sans-serif",
  arial: "Arial, Helvetica, sans-serif",
  verdana: "Verdana, Geneva, Tahoma, sans-serif",
  comicsans: "'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', cursive, sans-serif",
};

const panelFontOptions = Array.from(els.panelFontPickerList.querySelectorAll('.fontpicker-option'));
let panelFontListOpen = false;
let activePanelFontIndex = 0;

function applyPanelFont() {
  const stack = PANEL_FONT_STACKS[settings.panelFont];
  if (stack) document.documentElement.style.setProperty('--panel-font-family', stack);
  else document.documentElement.style.removeProperty('--panel-font-family');
}

function syncPanelFontPicker() {
  const value = settings.panelFont || 'default';
  const selected = panelFontOptions.find((o) => o.dataset.value === value) || panelFontOptions[0];

  panelFontOptions.forEach((o) => o.setAttribute('aria-selected', String(o === selected)));

  els.panelFontPickerValue.textContent = selected.querySelector('.fontpicker-name').textContent;
  els.panelFontPickerValue.className = `fontpicker-value ${fontOptionClass(selected)}`.trim();
  activePanelFontIndex = panelFontOptions.indexOf(selected);
}

function setActivePanelFontOption(index) {
  activePanelFontIndex = clamp(index, 0, panelFontOptions.length - 1);
  panelFontOptions.forEach((o, i) => o.classList.toggle('is-active', i === activePanelFontIndex));
  const active = panelFontOptions[activePanelFontIndex];
  els.panelFontPickerList.setAttribute('aria-activedescendant', active.id);
  active.scrollIntoView({ block: 'nearest' });
}

function openPanelFontList() {
  if (panelFontListOpen) return;
  panelFontListOpen = true;
  els.panelFontPickerList.hidden = false;
  els.panelFontPickerTrigger.setAttribute('aria-expanded', 'true');
  setActivePanelFontOption(panelFontOptions.findIndex((o) => o.getAttribute('aria-selected') === 'true'));
  els.panelFontPickerList.focus();
}

function closePanelFontList({ refocus = true } = {}) {
  if (!panelFontListOpen) return;
  panelFontListOpen = false;
  els.panelFontPickerList.hidden = true;
  els.panelFontPickerList.removeAttribute('aria-activedescendant');
  els.panelFontPickerTrigger.setAttribute('aria-expanded', 'false');
  panelFontOptions.forEach((o) => o.classList.remove('is-active'));
  if (refocus) els.panelFontPickerTrigger.focus();
}

function choosePanelFont(index) {
  const option = panelFontOptions[clamp(index, 0, panelFontOptions.length - 1)];
  persist({ panelFont: option.dataset.value });
  syncPanelFontPicker();
  applyPanelFont();
  closePanelFontList();
}

function wirePanelFontPicker() {
  els.panelFontPickerTrigger.addEventListener('click', () => {
    if (panelFontListOpen) closePanelFontList();
    else openPanelFontList();
  });

  els.panelFontPickerTrigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPanelFontList();
    }
  });

  els.panelFontPickerList.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActivePanelFontOption(activePanelFontIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActivePanelFontOption(activePanelFontIndex - 1);
        break;
      case 'Home':
        e.preventDefault();
        setActivePanelFontOption(0);
        break;
      case 'End':
        e.preventDefault();
        setActivePanelFontOption(panelFontOptions.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        choosePanelFont(activePanelFontIndex);
        break;
      case 'Escape':
        // Escape closes the list only; the panel-level Escape handler must not also fire.
        e.stopPropagation();
        closePanelFontList();
        break;
      case 'Tab':
        closePanelFontList();
        break;
      default:
        break;
    }
  });

  // Keep keyboard focus on the list itself so clicking an option never closes it early.
  els.panelFontPickerList.addEventListener('mousedown', (e) => e.preventDefault());

  panelFontOptions.forEach((option, index) => {
    option.addEventListener('click', () => choosePanelFont(index));
    option.addEventListener('mousemove', () => setActivePanelFontOption(index));
  });

  document.addEventListener('click', (e) => {
    if (panelFontListOpen && !els.panelFontPicker.contains(e.target)) closePanelFontList({ refocus: false });
  });
}

function populateUI() {
  syncFontPicker();
  syncThemeGrid();
  syncExtThemeGrid();
  syncPanelFontPicker();
  applyPanelFont();
  syncFeatureCards();

  els.fontScale.value = settings.fontScale;
  els.fontScaleOut.textContent = `${settings.fontScale}%`;

  els.letterSpacing.value = settings.letterSpacing || 0;
  els.letterSpacingOut.textContent = settings.letterSpacing ? `${Number(settings.letterSpacing).toFixed(2)}em` : 'Default';

  els.lineHeight.value = settings.lineHeight || 1.8;
  els.lineHeightOut.textContent = settings.lineHeight ? String(settings.lineHeight) : 'Default';

  els.bionicReading.checked = !!settings.bionicReading;
  els.toolbarVisible.checked = settings.toolbarVisible !== false;
  els.uiSoundsEnabled.checked = settings.uiSoundsEnabled !== false;

  els.cursorEnabled.checked = !!settings.cursorEnabled;
  syncCursorStylePicker();
  els.cursorSize.value = settings.cursorSize || 32;
  els.cursorSizeOut.textContent = `${settings.cursorSize || 32}px`;
  syncPalette();

  els.ttsRate.value = settings.ttsRate;
  els.ttsRateOut.textContent = `${settings.ttsRate.toFixed(1)}x`;
  els.ttsPitch.value = settings.ttsPitch;
  els.ttsPitchOut.textContent = settings.ttsPitch.toFixed(1);
  if (settings.voiceURI) els.voiceSelect.value = settings.voiceURI;
  // Also covers Reset All, which reverts pairingOpen to its collapsed default.
  syncPairingDisclosure();
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

/* The two Account buttons double as their own status readout. Both halves are swapped
   together - a "Page Saved" label next to a still-uploading cloud icon would be worse than
   either alone. Names are ligatures in Material Symbols Rounded (fonts/), which ships whole,
   so any documented icon name resolves. */
const CONNECT_IDLE = { icon: 'login', label: 'Connect' };
const CONNECT_DONE = { icon: 'check_circle', label: 'Connected' };
const SAVE_IDLE = { icon: 'cloud_upload', label: 'Save This Page' };
const SAVE_DONE = { icon: 'cloud_done', label: 'Page Saved' };

async function checkCurrentPageSaved() {
  try {
    const tab = await getActiveTab();
    if (!tab || !tab.url) return false;
    const res = await chrome.runtime.sendMessage({
      type: 'BACKEND_IS_PAGE_SAVED',
      payload: { url: tab.url },
    });
    return !!(res && res.ok && res.saved);
  } catch (e) {
    return false;
  }
}

function setButtonState(btn, iconEl, labelEl, state, done) {
  iconEl.textContent = state.icon;
  labelEl.textContent = state.label;
  btn.classList.toggle('is-done', !!done);
}

async function refreshBackendStatus() {
  const res = await chrome.runtime.sendMessage({ type: 'BACKEND_STATUS' });
  const connected = !!(res && res.ok && res.connected);
  // The Connect button says "Connected", so saying it here too would print it twice, one
  // line apart. Progress and failures still land here, where they have nowhere else to go.
  els.backendStatus.textContent = connected ? '' : 'Not connected';
  els.backendStatus.className = 'status-text';
  setButtonState(els.connectBtn, els.connectIcon, els.connectLabel,
    connected ? CONNECT_DONE : CONNECT_IDLE, connected);
  els.savePageBtn.disabled = !connected;
  // Only an authenticated session can mint a pairing code; redeeming one deliberately
  // stays available while disconnected, since that is the whole point of joining.
  els.pairCreateBtn.disabled = !connected;
  if (!connected) {
    hidePairCode();
    setButtonState(els.savePageBtn, els.savePageIcon, els.savePageLabel, SAVE_IDLE, false);
  } else {
    const isSaved = await checkCurrentPageSaved();
    if (isSaved) {
      setButtonState(els.savePageBtn, els.savePageIcon, els.savePageLabel, SAVE_DONE, true);
    } else {
      setButtonState(els.savePageBtn, els.savePageIcon, els.savePageLabel, SAVE_IDLE, false);
    }
  }
  return connected;
}

/* Pairing. A code links a second client to the same anonymous user so both see one
   saved-page library; nothing is copied between devices. Codes live 10 minutes, are
   single-use, and creating a new one invalidates the previous unused one. */

const PAIRING_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PAIRING_CODE_LIFETIME_MS = 10 * 60 * 1000;
// Under a minute left, reading the code out to someone is likely to lose the race.
const PAIRING_URGENT_MS = 60 * 1000;
// Sub-second so the bar slides instead of stepping, and the seconds flip close to when
// they actually change rather than up to a second late.
const PAIRING_TICK_MS = 250;
let pairExpiryTimer = null;
// Last countdown the tick rendered, mirrored onto the header badge when collapsed.
let pairBadgeText = '';
let pairBadgeUrgent = false;

// Mirrors the backend's alphabet, which drops I/O/0/1 so codes read aloud cleanly. The
// API rejects anything else outright, so tidy up what the user typed before sending.
function normalizePairingCode(raw) {
  return String(raw || '')
    .toUpperCase()
    .split('')
    .filter((ch) => PAIRING_ALPHABET.includes(ch))
    .join('');
}

/* The "Linked devices" disclosure. Collapsing must never hide the fact that a code is
   counting down, so whatever the countdown last wrote is mirrored into a badge on the
   header while the section is shut. */
function syncPairingBadge() {
  const live = !els.pairCodeBox.hidden && pairBadgeText !== '';
  els.pairingBadge.hidden = !!settings.pairingOpen || !live;
  els.pairingBadge.textContent = live ? pairBadgeText : '';
  els.pairingBadge.className = pairBadgeUrgent
    ? 'disclosure-badge urgent'
    : 'disclosure-badge';
}

/* Kept separate from the badge because this runs on toggle, not on every tick: rewriting
   aria-expanded four times a second is the kind of thing that makes a screen reader
   chatter. */
function syncPairingDisclosure() {
  const open = !!settings.pairingOpen;
  els.pairingToggle.setAttribute('aria-expanded', String(open));
  els.pairingBody.hidden = !open;
  syncPairingBadge();
}

function wirePairingDisclosure() {
  els.pairingToggle.addEventListener('click', () => {
    persist({ pairingOpen: !settings.pairingOpen });
    syncPairingDisclosure();
  });
}

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
  els.pairExpiry.className = 'status-text';
  els.pairExpiryBar.className = 'pair-expiry-bar';
  els.pairExpiryBar.style.width = '100%';
  pairBadgeText = '';
  pairBadgeUrgent = false;
  syncPairingBadge();
}

function showPairCode(code, expiresAt) {
  els.pairCode.textContent = code;
  els.pairCodeBox.hidden = false;

  // Read from the absolute deadline on every tick rather than counting down: this panel
  // lives inside a page that can be backgrounded for minutes at a time, which throttles
  // its timers, and a decremented counter would come back showing a stale number.
  const deadline = new Date(expiresAt).getTime();
  const tick = () => {
    const leftMs = deadline - Date.now();
    if (leftMs <= 0) {
      // The backend would reject it anyway; clearing it avoids reading out a dead code.
      hidePairCode();
      els.pairStatus.textContent = 'That code expired. Generate a new one.';
      return;
    }

    const urgent = leftMs <= PAIRING_URGENT_MS;
    const left = Math.ceil(leftMs / 1000);
    const mins = Math.floor(left / 60);
    const secs = String(left % 60).padStart(2, '0');
    els.pairExpiry.textContent = `Expires in ${mins}:${secs}`;
    els.pairExpiry.className = urgent ? 'status-text urgent' : 'status-text';
    els.pairExpiryBar.style.width = `${Math.max(0, Math.min(100, (leftMs / PAIRING_CODE_LIFETIME_MS) * 100))}%`;
    els.pairExpiryBar.className = urgent ? 'pair-expiry-bar urgent' : 'pair-expiry-bar';
    pairBadgeText = `${mins}:${secs}`;
    pairBadgeUrgent = urgent;
    syncPairingBadge();
  };
  tick();
  stopPairExpiryTimer();
  pairExpiryTimer = setInterval(tick, PAIRING_TICK_MS);
}

/* Stands in for window.confirm(), which Chrome ignores in a cross-origin iframe - and this
   panel is exactly that. A native confirm would return false without ever showing anything,
   so the link would appear to do nothing at all. Resolves false on Escape and on Cancel. */
function confirmRedeem() {
  return new Promise((resolve) => {
    const dialog = els.pairConfirmDialog;
    // showModal() throws if the dialog is already open. Nothing should reach here twice
    // while it is up, but the throw would land in an async click handler as an unhandled
    // rejection, so decline rather than risk it: never link on an ambiguous answer.
    if (dialog.open) {
      resolve(false);
      return;
    }
    dialog.returnValue = '';
    const onClose = () => {
      dialog.removeEventListener('close', onClose);
      resolve(dialog.returnValue === 'confirm');
    };
    dialog.addEventListener('close', onClose);
    dialog.showModal();
  });
}

/* The async clipboard API needs a `clipboard-write` permissions-policy delegation to work in
   a cross-origin frame (content/panel.js grants it on the iframe). Older Chrome builds and
   any future tightening still fall through to execCommand, and failing that the code is left
   selected so Ctrl+C works. Something has to get the code onto the other device. */
async function copyPairCode() {
  try {
    await navigator.clipboard.writeText(els.pairCode.textContent);
    return 'Code copied.';
  } catch (e) {
    // Fall through to the selection-based path below.
  }

  const range = document.createRange();
  range.selectNodeContents(els.pairCode);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  try {
    if (document.execCommand('copy')) return 'Code copied.';
  } catch (e) {
    // Both paths are gone; the selection below is the fallback.
  }
  return 'Could not copy automatically - the code is selected, press Ctrl+C.';
}

function wirePairingEvents() {
  els.pairCreateBtn.addEventListener('click', async () => {
    els.pairCreateBtn.disabled = true;
    els.pairStatus.textContent = 'Requesting a code...';
    const res = await chrome.runtime.sendMessage({ type: 'BACKEND_CREATE_PAIRING_CODE' });
    els.pairCreateBtn.disabled = false;

    if (res && res.ok) {
      showPairCode(res.code, res.expiresAt);
      els.pairStatus.textContent = 'Enter this code on the other device within 10 minutes.';
    } else {
      hidePairCode();
      els.pairStatus.textContent =
        (res && res.error) === 'pairing_rate_limited'
          ? 'Too many codes requested. Try again later.'
          : `Could not get a code (${(res && res.error) || 'unknown'}).`;
    }
  });

  els.pairCopyBtn.addEventListener('click', async () => {
    els.pairStatus.textContent = await copyPairCode();
  });

  // Normalizing as the user types means a code pasted with dashes or in lower case still
  // looks right in the field, rather than being silently fixed only on submit.
  els.pairCodeInput.addEventListener('input', () => {
    els.pairCodeInput.value = normalizePairingCode(els.pairCodeInput.value).slice(0, 8);
  });

  els.pairRedeemBtn.addEventListener('click', async () => {
    const code = normalizePairingCode(els.pairCodeInput.value);
    if (code.length !== 8) {
      els.pairStatus.textContent = 'Enter the full 8-character code.';
      return;
    }

    // Redeeming swaps this device onto the other device's user, so anything saved under the
    // current session becomes unreachable from here. Destructive enough to confirm first.
    const confirmed = await confirmRedeem();
    if (!confirmed) return;

    els.pairRedeemBtn.disabled = true;
    els.pairStatus.textContent = 'Linking...';
    const res = await chrome.runtime.sendMessage({
      type: 'BACKEND_REDEEM_PAIRING_CODE',
      payload: { code },
    });
    els.pairRedeemBtn.disabled = false;

    if (res && res.ok) {
      els.pairCodeInput.value = '';
      hidePairCode();
      els.pairStatus.textContent = 'Linked. This device now shares the other library.';
      await refreshBackendStatus();
    } else {
      const err = (res && res.error) || 'unknown';
      els.pairStatus.textContent =
        err === 'invalid_pairing_code'
          ? 'That code is invalid, already used, or expired.'
          : err === 'pairing_rate_limited'
            ? 'Too many attempts. Try again later.'
            : `Linking failed (${err}).`;
    }
  });
}

/* When a page is saved, the button switches to "Page Saved" and stays in this state for
   as long as this page remains saved by the user. */
function showPageSaved() {
  els.saveStatus.textContent = '';
  setButtonState(els.savePageBtn, els.savePageIcon, els.savePageLabel, SAVE_DONE, true);
  els.savePageBtn.disabled = false;
}

function wireBackendEvents() {
  els.connectBtn.addEventListener('click', async () => {
    els.connectBtn.disabled = true;
    els.backendStatus.textContent = 'Connecting...';
    els.backendStatus.className = 'status-text';
    const res = await chrome.runtime.sendMessage({ type: 'BACKEND_CONNECT' });
    els.connectBtn.disabled = false;
    if (res && res.ok) {
      // Leaves the button reading "Connected" with a filled check.
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

      if (res && res.ok) {
        showPageSaved();
        return;
      }
      els.saveStatus.textContent = `Save failed (${(res && res.error) || 'unknown'}).`;
    } catch (e) {
      els.saveStatus.textContent = 'Cannot save this page (try a regular website tab).';
    }
    await refreshBackendStatus();
  });
}

/* ---------- Pomodoro timer ----------
   Unlike the a11y settings above, the timer's truth lives in the background service worker
   (see background/background.js) because it has to keep counting down via chrome.alarms even
   while this panel is closed. This panel is just a renderer: it fetches state on open, mirrors
   any change the background makes through chrome.storage.onChanged (so two open panels in two
   tabs never disagree), and sends control messages rather than mutating state itself. */

const POMODORO_TICK_MS = 250;
const POMODORO_MODE_LABEL = { work: 'Focus', shortBreak: 'Short Break' };
const POMODORO_RING_RADIUS = 54;
const POMODORO_RING_CIRCUMFERENCE = 2 * Math.PI * POMODORO_RING_RADIUS;
let pomodoro = null;
let pomodoroTimer = null;

els.pomodoroRingProgress.style.strokeDasharray = `${POMODORO_RING_CIRCUMFERENCE}`;

function updatePomodoroRing(remainingMs) {
  if (!pomodoro) return;
  const totalMs = pomodoroModeDurationMs(pomodoro.mode, pomodoro.settings);
  const elapsedRatio = totalMs > 0 ? clamp(1 - remainingMs / totalMs, 0, 1) : 0;
  els.pomodoroRingProgress.style.strokeDashoffset = `${POMODORO_RING_CIRCUMFERENCE * elapsedRatio}`;
}

function pomodoroModeDurationMs(mode, settings) {
  const minutes = mode === 'work' ? settings.workMin : settings.shortBreakMin;
  return Math.max(1, minutes || 1) * 60 * 1000;
}

function formatClock(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const mins = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

// Mirrors the pairing code's deadline-based countdown: read from endsAt vs. now() on every
// tick rather than decrementing a counter, so a throttled/backgrounded panel can't drift.
function pomodoroRemainingMs() {
  if (!pomodoro) return 0;
  if (pomodoro.running && pomodoro.endsAt) return Math.max(0, pomodoro.endsAt - Date.now());
  if (pomodoro.remainingMs != null) return pomodoro.remainingMs;
  return pomodoroModeDurationMs(pomodoro.mode, pomodoro.settings);
}

function renderPomodoro() {
  if (!pomodoro) return;

  els.pomodoroModeLabel.textContent = POMODORO_MODE_LABEL[pomodoro.mode] || 'Focus';
  els.pomodoroModeLabel.classList.toggle('is-break', pomodoro.mode !== 'work');
  const remainingMs = pomodoroRemainingMs();
  els.pomodoroTime.textContent = formatClock(remainingMs);
  updatePomodoroRing(remainingMs);

  els.pomodoroCycleLabel.textContent = `Focus session ${pomodoro.cyclesCompleted + 1}`;

  els.pomodoroStartIcon.textContent = pomodoro.running ? 'pause' : 'play_arrow';
  els.pomodoroStartLabel.textContent = pomodoro.running
    ? 'Pause'
    : (pomodoro.remainingMs != null ? 'Resume' : 'Start');

  els.pomodoroWork.value = pomodoro.settings.workMin;
  els.pomodoroWorkOut.textContent = `${pomodoro.settings.workMin} min`;
  els.pomodoroShortBreak.value = pomodoro.settings.shortBreakMin;
  els.pomodoroShortBreakOut.textContent = `${pomodoro.settings.shortBreakMin} min`;
  els.pomodoroAutoStart.checked = pomodoro.settings.autoStartNext !== false;
  els.pomodoroNotify.checked = pomodoro.settings.notify !== false;
}

function startPomodoroTicker() {
  stopPomodoroTicker();
  pomodoroTimer = setInterval(() => {
    if (pomodoro && pomodoro.running) {
      const remainingMs = pomodoroRemainingMs();
      els.pomodoroTime.textContent = formatClock(remainingMs);
      updatePomodoroRing(remainingMs);
    }
  }, POMODORO_TICK_MS);
}

function stopPomodoroTicker() {
  if (pomodoroTimer !== null) {
    clearInterval(pomodoroTimer);
    pomodoroTimer = null;
  }
}

async function refreshPomodoroState() {
  const res = await chrome.runtime.sendMessage({ type: 'POMODORO_GET_STATE' });
  if (res && res.ok) {
    pomodoro = res.state;
    renderPomodoro();
  }
}

function wirePomodoroSetting({ rangeEl, downBtn, upBtn, step, key, outEl, format }) {
  const min = Number(rangeEl.min);
  const max = Number(rangeEl.max);

  function preview(rawVal) {
    outEl.textContent = format(Number(rawVal));
  }

  async function commit(rawVal) {
    const val = clamp(Number(rawVal), min, max);
    rangeEl.value = val;
    preview(val);
    const res = await chrome.runtime.sendMessage({ type: 'POMODORO_UPDATE_SETTINGS', payload: { [key]: val } });
    if (res && res.ok) {
      pomodoro = res.state;
      renderPomodoro();
    }
  }

  rangeEl.addEventListener('input', () => preview(rangeEl.value));
  rangeEl.addEventListener('change', () => commit(rangeEl.value));
  downBtn.addEventListener('click', () => commit(clamp(Number(rangeEl.value) - step, min, max)));
  upBtn.addEventListener('click', () => commit(clamp(Number(rangeEl.value) + step, min, max)));
}

function wirePomodoro() {
  els.pomodoroStartBtn.addEventListener('click', async () => {
    const type = pomodoro && pomodoro.running ? 'POMODORO_PAUSE' : 'POMODORO_START';
    const res = await chrome.runtime.sendMessage({ type });
    if (res && res.ok) {
      pomodoro = res.state;
      renderPomodoro();
    }
  });

  els.pomodoroResetBtn.addEventListener('click', async () => {
    const res = await chrome.runtime.sendMessage({ type: 'POMODORO_RESET' });
    if (res && res.ok) {
      pomodoro = res.state;
      renderPomodoro();
    }
  });

  els.pomodoroSkipBtn.addEventListener('click', async () => {
    const res = await chrome.runtime.sendMessage({ type: 'POMODORO_SKIP' });
    if (res && res.ok) {
      pomodoro = res.state;
      renderPomodoro();
    }
  });

  els.pomodoroSettingsToggle.addEventListener('click', () => {
    const open = els.pomodoroSettingsToggle.getAttribute('aria-expanded') !== 'true';
    els.pomodoroSettingsToggle.setAttribute('aria-expanded', String(open));
    els.pomodoroSettingsBody.hidden = !open;
  });

  wirePomodoroSetting({
    rangeEl: els.pomodoroWork, downBtn: els.pomodoroWorkDown, upBtn: els.pomodoroWorkUp,
    step: 1, key: 'workMin', outEl: els.pomodoroWorkOut, format: (v) => `${v} min`,
  });
  wirePomodoroSetting({
    rangeEl: els.pomodoroShortBreak, downBtn: els.pomodoroShortBreakDown, upBtn: els.pomodoroShortBreakUp,
    step: 1, key: 'shortBreakMin', outEl: els.pomodoroShortBreakOut, format: (v) => `${v} min`,
  });

  els.pomodoroAutoStart.addEventListener('change', async () => {
    const res = await chrome.runtime.sendMessage({
      type: 'POMODORO_UPDATE_SETTINGS',
      payload: { autoStartNext: els.pomodoroAutoStart.checked },
    });
    if (res && res.ok) {
      pomodoro = res.state;
      renderPomodoro();
    }
  });

  els.pomodoroNotify.addEventListener('change', async () => {
    const res = await chrome.runtime.sendMessage({
      type: 'POMODORO_UPDATE_SETTINGS',
      payload: { notify: els.pomodoroNotify.checked },
    });
    if (res && res.ok) {
      pomodoro = res.state;
      renderPomodoro();
    }
  });
}

/* ---------- Focus Sounds (music) ----------
   Same split as the pomodoro timer: playback truth lives in the background service worker
   (which hands it off to an offscreen document so it survives this panel closing - see
   background/background.js and offscreen/offscreen.js), and this panel just renders state and
   sends control messages. MUSIC_LIBRARY is intentionally the same static shape as the one in
   background.js - this codebase already keeps DEFAULT_SETTINGS duplicated the same way across
   sidebar.js/content.js/background.js rather than sharing a module across the mixed classic-
   script/ES-module contexts, so this follows that existing convention. */
// `icon` names below are Material Symbols Rounded ligatures - the bundled woff2 is the full
// icon set (see the @font-face comment in sidebar.css), so any documented icon name works here.
const MUSIC_LIBRARY = {
  whiteNoise: { label: 'White Noise', tracks: [{ id: 'default', label: 'White Noise', icon: 'graphic_eq' }] },
  brownNoise: { label: 'Brown Noise', tracks: [{ id: 'default', label: 'Brown Noise', icon: 'water_drop' }] },
  lofi: {
    label: 'Lo-fi',
    tracks: [
      { id: 'lofi-rainy', label: 'Rainy Day', icon: 'water_drop' },
      { id: 'lofi-latenight', label: 'Late Night', icon: 'bedtime' },
      { id: 'lofi-studybreak', label: 'Study Break', icon: 'local_cafe' },
    ],
  },
  classical: {
    label: 'Classical',
    tracks: [
      { id: 'classical-moonlight', label: 'Moonlight', icon: 'bedtime' },
      { id: 'classical-reverie', label: 'Reverie', icon: 'blur_on' },
      { id: 'classical-sonata', label: 'Sonata', icon: 'piano' },
    ],
  },
  ambient: {
    label: 'Ambient',
    tracks: [
      { id: 'ambient-warm', label: 'Warm Drone', icon: 'sunny' },
      { id: 'ambient-airy', label: 'Airy Pad', icon: 'blur_on' },
      { id: 'ambient-deep', label: 'Deep Space', icon: 'dark_mode' },
    ],
  },
  nature: {
    label: 'Nature',
    tracks: [
      { id: 'rain', label: 'Rain', icon: 'water_drop' },
      { id: 'ocean', label: 'Ocean Waves', icon: 'water_drop' },
      { id: 'forest', label: 'Forest', icon: 'forest' },
    ],
  },
};

let music = null;

function currentMusicTrackLabel() {
  const category = MUSIC_LIBRARY[music.categoryId];
  if (!category) return '';
  const track = category.tracks.find((t) => t.id === music.trackId);
  if (!track) return '';
  // Single-track categories (the generated noises) name the track after the category itself,
  // so "White Noise — White Noise" would just repeat the same word twice.
  return category.tracks.length > 1 ? `${category.label} — ${track.label}` : category.label;
}

// Not setCardState: that helper ties the icon swap to the same boolean as the selection
// highlight, but here they're independent - a paused card stays visually "selected" (ring) while
// still showing its category icon, and only swaps to the pause glyph while actually playing.
function syncMusicCategoryGrid() {
  els.musicCategoryGrid.querySelectorAll('.card').forEach((btn) => {
    const selected = !!music && music.categoryId === btn.dataset.category;
    btn.classList.toggle('active', selected);
    btn.setAttribute('aria-pressed', String(selected));
    const icon = btn.querySelector('.card-icon');
    if (icon) icon.textContent = (selected && music.playing) ? 'pause' : btn.dataset.icon;
  });
}

/* ---------- Track picker ----------
   A custom listbox rather than a plain <select>, mirroring the Typography section's font
   picker (see wireFontPicker below) - a native <select>'s <option> can only ever show plain
   text, so it cannot put an icon next to each track name. Unlike the font picker's static
   list, these options depend on whichever category is currently selected, so they're rebuilt
   on every category switch (buildTrackOptions) rather than living fixed in the HTML; the
   interaction wiring below still only needs to run once, since it's attached to the picker's
   stable container elements and listens for options via delegation. */
let trackListOpen = false;
let activeTrackIndex = 0;
let trackOptionEls = [];

function buildTrackOptions(category) {
  els.musicTrackList.innerHTML = '';
  trackOptionEls = category.tracks.map((t) => {
    const li = document.createElement('li');
    li.className = 'trackpicker-option';
    li.setAttribute('role', 'option');
    li.id = `track-opt-${t.id}`;
    li.dataset.value = t.id;
    li.setAttribute('aria-selected', String(t.id === music.trackId));

    const icon = document.createElement('span');
    icon.className = 'micon trackpicker-option-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = t.icon;

    const name = document.createElement('span');
    name.className = 'trackpicker-name';
    name.textContent = t.label;

    const check = document.createElement('span');
    check.className = 'micon trackpicker-check';
    check.setAttribute('aria-hidden', 'true');
    check.textContent = 'check';

    li.append(icon, name, check);
    els.musicTrackList.appendChild(li);
    return li;
  });
}

function setActiveTrackOption(index) {
  if (trackOptionEls.length === 0) return;
  activeTrackIndex = clamp(index, 0, trackOptionEls.length - 1);
  trackOptionEls.forEach((o, i) => o.classList.toggle('is-active', i === activeTrackIndex));
  const active = trackOptionEls[activeTrackIndex];
  els.musicTrackList.setAttribute('aria-activedescendant', active.id);
  active.scrollIntoView({ block: 'nearest' });
}

function openTrackList() {
  if (trackListOpen || trackOptionEls.length === 0) return;
  trackListOpen = true;
  els.musicTrackList.hidden = false;
  els.musicTrackTrigger.setAttribute('aria-expanded', 'true');
  const selectedIndex = trackOptionEls.findIndex((o) => o.getAttribute('aria-selected') === 'true');
  setActiveTrackOption(selectedIndex === -1 ? 0 : selectedIndex);
  els.musicTrackList.focus();
}

function closeTrackList({ refocus = true } = {}) {
  if (!trackListOpen) return;
  trackListOpen = false;
  els.musicTrackList.hidden = true;
  els.musicTrackList.removeAttribute('aria-activedescendant');
  els.musicTrackTrigger.setAttribute('aria-expanded', 'false');
  trackOptionEls.forEach((o) => o.classList.remove('is-active'));
  if (refocus) els.musicTrackTrigger.focus();
}

async function chooseTrack(index) {
  const option = trackOptionEls[clamp(index, 0, trackOptionEls.length - 1)];
  if (!option) return;
  closeTrackList();
  const res = await chrome.runtime.sendMessage({
    type: 'MUSIC_SELECT',
    payload: { categoryId: music.categoryId, trackId: option.dataset.value },
  });
  if (res && res.ok) {
    music = res.state;
    renderMusic();
  }
}

function wireTrackPicker() {
  els.musicTrackTrigger.addEventListener('click', () => {
    if (trackListOpen) closeTrackList();
    else openTrackList();
  });

  els.musicTrackTrigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openTrackList();
    }
  });

  els.musicTrackList.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveTrackOption(activeTrackIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveTrackOption(activeTrackIndex - 1);
        break;
      case 'Home':
        e.preventDefault();
        setActiveTrackOption(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveTrackOption(trackOptionEls.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        chooseTrack(activeTrackIndex);
        break;
      case 'Escape':
        // Escape closes the list only; the panel-level Escape handler must not also fire.
        e.stopPropagation();
        closeTrackList();
        break;
      case 'Tab':
        closeTrackList();
        break;
      default:
        break;
    }
  });

  // Keep keyboard focus on the list itself so clicking an option never closes it early.
  els.musicTrackList.addEventListener('mousedown', (e) => e.preventDefault());

  // Delegated rather than attached per-option, since options are rebuilt on every category
  // switch (buildTrackOptions) rather than living fixed in the HTML like the font picker's.
  els.musicTrackList.addEventListener('click', (e) => {
    const option = e.target.closest('.trackpicker-option');
    if (!option) return;
    chooseTrack(trackOptionEls.indexOf(option));
  });
  els.musicTrackList.addEventListener('mousemove', (e) => {
    const option = e.target.closest('.trackpicker-option');
    if (!option) return;
    const index = trackOptionEls.indexOf(option);
    if (index !== -1 && index !== activeTrackIndex) setActiveTrackOption(index);
  });

  document.addEventListener('click', (e) => {
    if (trackListOpen && !els.musicTrackPicker.contains(e.target)) closeTrackList({ refocus: false });
  });
}

function syncMusicTrackSelect() {
  const category = MUSIC_LIBRARY[music.categoryId];
  if (!category || category.tracks.length <= 1) {
    els.musicTrackField.hidden = true;
    closeTrackList({ refocus: false });
    return;
  }
  els.musicTrackField.hidden = false;
  buildTrackOptions(category);

  const selected = category.tracks.find((t) => t.id === music.trackId) || category.tracks[0];
  els.musicTrackValueIcon.textContent = selected.icon;
  els.musicTrackValue.textContent = selected.label;
}

function renderMusic() {
  if (!music) return;

  syncMusicCategoryGrid();
  syncMusicTrackSelect();

  const volumePct = Math.round((music.volume != null ? music.volume : 0.6) * 100);
  els.musicVolume.value = volumePct;
  els.musicVolumeOut.textContent = `${volumePct}%`;

  els.musicStatus.textContent = music.lastError
    ? music.lastError
    : (music.playing ? `Playing: ${currentMusicTrackLabel()}` : '');
  els.musicStatus.className = music.lastError ? 'hint err' : 'hint';
}

async function refreshMusicState() {
  const res = await chrome.runtime.sendMessage({ type: 'MUSIC_GET_STATE' });
  if (res && res.ok) {
    music = res.state;
    renderMusic();
  }
}

function wireMusic() {
  els.musicCategoryGrid.querySelectorAll('.card').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const category = btn.dataset.category;
      const isSameCategory = music && music.categoryId === category;

      // The dedicated Play/Pause button is gone - each card now doubles as one: clicking the
      // sound that's already playing pauses it, and clicking any other card (or the same one
      // while paused) selects and (re)starts it, in one click instead of select-then-press-play.
      if (isSameCategory && music.playing) {
        const res = await chrome.runtime.sendMessage({ type: 'MUSIC_PAUSE' });
        if (res && res.ok) {
          music = res.state;
          renderMusic();
        }
        return;
      }

      // Only re-select when actually switching category - MUSIC_SELECT resets to that
      // category's default track, so resuming the same (paused) category must skip it and go
      // straight to MUSIC_PLAY, or it would silently drop whichever track was picked before.
      if (!isSameCategory) {
        const selectRes = await chrome.runtime.sendMessage({
          type: 'MUSIC_SELECT',
          payload: { categoryId: category },
        });
        if (selectRes && selectRes.ok) {
          music = selectRes.state;
          renderMusic();
        }
      }

      const playRes = await chrome.runtime.sendMessage({ type: 'MUSIC_PLAY' });
      if (playRes && playRes.ok) {
        music = playRes.state;
        renderMusic();
      }
    });
  });

  wireTrackPicker();

  els.musicVolume.addEventListener('input', () => {
    els.musicVolumeOut.textContent = `${els.musicVolume.value}%`;
  });
  els.musicVolume.addEventListener('change', async () => {
    const volume = Number(els.musicVolume.value) / 100;
    const res = await chrome.runtime.sendMessage({ type: 'MUSIC_SET_VOLUME', payload: { volume } });
    if (res && res.ok) {
      music = res.state;
      renderMusic();
    }
  });
}

/* ---------- UI sound effects ----------
   Short synthesized blips (Web Audio, no bundled files - same reasoning as the generated Focus
   Sounds) confirming a button press or a slider/checkbox/select commit. Delegated at the
   document level rather than wired into every individual handler, so every control in the
   panel gets it automatically - including the pomodoro/music buttons above and anything added
   later - without having to remember to call it from each one. */
let sfxCtx = null;

function getSfxCtx() {
  if (!sfxCtx) sfxCtx = new AudioContext();
  if (sfxCtx.state === 'suspended') sfxCtx.resume();
  return sfxCtx;
}

function playBlip({ freq, duration, type, gain }) {
  if (settings.uiSoundsEnabled === false) return;
  const ctx = getSfxCtx();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(gain, now + 0.008);
  // Ramping to a near-zero (never exactly zero - exponential ramps can't target 0) value
  // instead of a flat cutoff is what keeps this sounding like a soft blip rather than a click.
  env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(env).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playClickSfx() {
  playBlip({ freq: 620, duration: 0.09, type: 'triangle', gain: 0.14 });
}

function playTickSfx() {
  playBlip({ freq: 900, duration: 0.05, type: 'sine', gain: 0.09 });
}

// Quieter/shorter than playTickSfx: a slider drag can cross many steps a second, so this needs
// to read as a texture of detents (like a volume knob) rather than stack into a blur of the
// louder, longer confirmation tick used for checkboxes/selects.
function playSliderTickSfx() {
  playBlip({ freq: 1100, duration: 0.025, type: 'sine', gain: 0.05 });
}

// Tracks each range's last-ticked value so a redundant 'input' (same value re-dispatched) never
// double-ticks - keyed by element rather than deduped globally, since two sliders can legitimately
// sit on the same value at once.
const sliderTickValues = new WeakMap();

function wireUiSfx() {
  // Bubbling means a click on an icon <span> inside a <button> still resolves via closest().
  document.addEventListener('click', (e) => {
    if (e.target.closest('button, a.btn, .swatch, .fontpicker-option, .quick-jump-link')) playClickSfx();
  });
  // 'input' rather than 'change' for ranges: a browser range input only dispatches 'input' when
  // the (step-quantized) value actually moves, so this ticks once per step boundary crossed
  // while dragging - not once on release - the way a physical detented knob would.
  document.addEventListener('input', (e) => {
    if (!e.target.matches('input[type="range"]')) return;
    if (sliderTickValues.get(e.target) === e.target.value) return;
    sliderTickValues.set(e.target, e.target.value);
    playSliderTickSfx();
  });
  // Checkboxes and selects only ever commit once, so 'change' (not 'input') is the right event
  // for them; ranges are excluded here since the 'input' listener above already covers them.
  document.addEventListener('change', (e) => {
    if (e.target.matches('input[type="checkbox"], select')) playTickSfx();
  });
}

/* The panel runs as an overlay iframe inside the page (see content/panel.js), so hiding it
   is a message to the host frame rather than a window close. */
function hidePanel() {
  if (window.parent !== window) window.parent.postMessage({ type: 'A11Y_PANEL_CLOSE' }, '*');
}

function wireEvents() {
  wireFontPicker();
  wirePanelFontPicker();

  els.hidePanelBtn.addEventListener('click', hidePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !fontListOpen && !trackListOpen && !panelFontListOpen) hidePanel();
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
  els.uiSoundsEnabled.addEventListener('change', () => persist({ uiSoundsEnabled: els.uiSoundsEnabled.checked }));

  els.cursorEnabled.addEventListener('change', () => persist({ cursorEnabled: els.cursorEnabled.checked }));
  wireCursorStylePicker();
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
    els.powerHint.textContent = 'All settings have been reset to defaults.';
    els.powerHint.style.color = 'var(--color-accent)';
    setTimeout(() => {
      els.powerHint.textContent = 'Changes are saved as you make them.';
      els.powerHint.style.removeProperty('color');
    }, 2500);
  };

  if (els.resetBtn) els.resetBtn.addEventListener('click', handleReset);
  if (els.resetAllBtn) els.resetAllBtn.addEventListener('click', handleReset);
}

// Background writes to storage on every pomodoro state change; mirroring that here means a
// second panel open in another tab (or a session-end alarm firing while this one sits idle)
// still shows up without the panel having to poll for it.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.pomodoroState) {
    pomodoro = changes.pomodoroState.newValue;
    renderPomodoro();
  }
  if (changes.musicState) {
    music = changes.musicState.newValue;
    renderMusic();
  }
});

async function init() {
  const stored = await chrome.storage.local.get(['a11ySettings']);
  settings = { ...DEFAULT_SETTINGS, ...(stored.a11ySettings || {}) };
  populateUI();
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
  wireEvents();
  wireBackendEvents();
  wirePairingDisclosure();
  wirePairingEvents();
  refreshBackendStatus();
  wirePomodoro();
  await refreshPomodoroState();
  startPomodoroTicker();
  wireMusic();
  await refreshMusicState();
  wireUiSfx();
}

init();
