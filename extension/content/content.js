/* Content script orchestrator: wires storage settings, messages, and keyboard commands */
(function () {
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
  };

  // Values forced while the extension is switched off from the sidebar. The user's own
  // choices stay in storage untouched, so flipping back on restores them exactly.
  const OFF_OVERRIDES = {
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
    toolbarVisible: false,
  };

  let settings = { ...DEFAULT_SETTINGS };

  function isEnabled() {
    return settings.extensionEnabled !== false;
  }

  function effectiveSettings() {
    return isEnabled() ? settings : { ...settings, ...OFF_OVERRIDES };
  }

  function applyAll() {
    const effective = effectiveSettings();
    window.A11yRestyler && window.A11yRestyler.applyState(effective);
    window.A11yScreenReader &&
      window.A11yScreenReader.updateSettings({
        rate: effective.ttsRate,
        pitch: effective.ttsPitch,
        voiceURI: effective.voiceURI,
      });
    if (!isEnabled() && window.A11yScreenReader) window.A11yScreenReader.stopReading();
    window.A11yToolbar && window.A11yToolbar.setVisible(effective.toolbarVisible !== false && isEnabled());
  }

  function loadSettings(cb) {
    chrome.storage.local.get(['a11ySettings'], (res) => {
      settings = { ...DEFAULT_SETTINGS, ...(res.a11ySettings || {}) };
      cb && cb();
    });
  }

  function saveSettings() {
    chrome.storage.local.set({ a11ySettings: settings });
  }

  function updateSetting(partial) {
    settings = { ...settings, ...partial };
    applyAll();
    saveSettings();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.a11ySettings) return;
    settings = { ...DEFAULT_SETTINGS, ...(changes.a11ySettings.newValue || {}) };
    applyAll();
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) return;

    switch (message.type) {
      case 'COMMAND': {
        if (!isEnabled()) break;
        switch (message.command) {
          case 'toggle-read':
            window.A11yScreenReader && window.A11yScreenReader.toggleRead();
            break;
          case 'next-element':
            window.A11yScreenReader && window.A11yScreenReader.next();
            break;
          case 'prev-element':
            window.A11yScreenReader && window.A11yScreenReader.prev();
            break;
        }
        break;
      }
      case 'TOGGLE_PANEL':
        sendResponse({ ok: true, open: window.A11yPanel ? window.A11yPanel.toggle() : false });
        break;
      case 'UPDATE_SETTING':
        updateSetting(message.payload || {});
        sendResponse({ ok: true });
        break;
      case 'GET_SETTINGS':
        sendResponse({ settings });
        break;
      case 'TOGGLE_READ':
        if (!isEnabled()) {
          sendResponse({ ok: false, reason: 'extension-off' });
          break;
        }
        window.A11yScreenReader && window.A11yScreenReader.toggleRead();
        sendResponse({ ok: true });
        break;
      case 'EXTRACT_PAGE':
        sendResponse(window.A11yExtractor ? window.A11yExtractor.extractPage() : { ok: false, reason: 'no-extractor' });
        break;
      case 'RESET_SESSION':
        settings = { ...DEFAULT_SETTINGS };
        applyAll();
        if (window.A11yScreenReader) window.A11yScreenReader.stopReading();
        sendResponse({ ok: true });
        break;
    }
    return undefined;
  });

  window.A11yContent = { updateSetting, getSettings: () => settings };

  loadSettings(() => {
    applyAll();
    if (window.A11yToolbar) window.A11yToolbar.init({ settings: effectiveSettings(), togglePanel: () => window.A11yPanel && window.A11yPanel.toggle() });
  });
})();
