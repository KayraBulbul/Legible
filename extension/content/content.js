/* Content script orchestrator: wires storage settings, messages, HUD, and keyboard commands */
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
    cursorColor: '#2563eb',
    ttsRate: 1,
    ttsPitch: 1,
    voiceURI: null,
    hudVisible: true,
    aiEnabled: true,
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
    hudVisible: false,
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
    window.A11yHud && window.A11yHud.setVisible(effective.hudVisible);
    window.A11yHud && window.A11yHud.syncState(effective);
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

  async function runAiScan() {
    if (!window.A11yScanner) return { ok: false };
    if (!isEnabled()) return { ok: false, reason: 'extension-off' };
    if (!settings.aiEnabled) {
      window.A11yHud && window.A11yHud.setStatus('AI scanning is disabled in settings.');
      return { ok: false, reason: 'ai-disabled' };
    }
    window.A11yHud && window.A11yHud.setStatus('Scanning page for missing alt text...');
    const result = await window.A11yScanner.scanPage(document.body);
    if (result.scanned === 0) {
      window.A11yHud && window.A11yHud.setStatus('No unlabeled images, icons, or canvases found.');
    } else if (result.results.every((r) => !r.ok && r.reason === 'missing-api-key')) {
      window.A11yHud && window.A11yHud.setStatus('Add a Gemini API key in the sidebar to enable AI scanning.');
    } else {
      const okCount = result.results.filter((r) => r.ok).length;
      window.A11yHud && window.A11yHud.setStatus(`AI scan complete: ${okCount}/${result.scanned} element(s) labeled.`);
    }
    return { ok: true, result };
  }

  async function runAiScanFocused() {
    const el = window.A11yScreenReader && window.A11yScreenReader.getFocusedOrHoveredImage();
    if (!el) {
      window.A11yHud && window.A11yHud.setStatus('Hover or focus an image first, then press Alt+A.');
      return;
    }
    window.A11yHud && window.A11yHud.setStatus('Analyzing image...');
    const result = await window.A11yScanner.scanSingleElement(el);
    window.A11yHud &&
      window.A11yHud.setStatus(result.ok ? `AI: ${result.altText}` : 'AI scan failed for this element.');
  }

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
          case 'ai-scan-focused':
            runAiScanFocused();
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
      case 'RUN_AI_SCAN':
        runAiScan().then(sendResponse);
        return true;
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
    }
    return undefined;
  });

  window.A11yContent = { updateSetting, runAiScan, runAiScanFocused, getSettings: () => settings };

  loadSettings(() => {
    applyAll();
    if (window.A11yHud) window.A11yHud.init({ settings: effectiveSettings(), updateSetting, runAiScan });
  });
})();
