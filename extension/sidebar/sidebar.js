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
  // Linked devices is collapsed by default: pairing is a once-per-device errand, and the
  // panel is only 372px wide, so it should not cost the reading controls any height.
  pairingOpen: false,
};

const els = {
  resetBtn: document.getElementById('resetBtn'),
  resetAllBtn: document.getElementById('resetAllBtn'),
  hidePanelBtn: document.getElementById('hidePanelBtn'),
  powerBtn: document.getElementById('powerBtn'),
  powerIcon: document.getElementById('powerIcon'),
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

/* ---------- Master on/off ----------
   The header X saves the current settings and switches every page effect off; it
   never clears what the user configured, so turning back on restores it all. */
function syncPowerUI() {
  const off = settings.extensionEnabled === false;
  document.body.classList.toggle('is-off', off);
  els.powerBtn.classList.toggle('is-off', off);
  els.powerIcon.textContent = off ? 'power_settings_new' : 'close';

  const label = off ? 'Turn accessibility features back on' : 'Save settings and turn off';
  els.powerBtn.setAttribute('aria-label', label);
  els.powerBtn.title = label;
  els.powerHint.textContent = off
    ? 'Turned off. Your settings are saved — press the power button to resume.'
    : 'Changes are saved as you make them.';
}

function populateUI() {
  syncPowerUI();
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

  els.powerBtn.addEventListener('click', () => {
    persist({ extensionEnabled: settings.extensionEnabled === false });
    syncPowerUI();
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
    els.powerHint.textContent = 'All settings have been reset to defaults.';
    els.powerHint.style.color = 'var(--color-accent)';
    setTimeout(() => {
      syncPowerUI();
      els.powerHint.style.removeProperty('color');
    }, 2500);
  };

  if (els.resetBtn) els.resetBtn.addEventListener('click', handleReset);
  if (els.resetAllBtn) els.resetAllBtn.addEventListener('click', handleReset);
}

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
}

init();
