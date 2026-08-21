/* A11y Restyler Engine: injects theme stylesheets and toggles presets on <html> */
(function () {
  const STYLE_FILES = {
    'dyslexia-lexend': 'styles/dyslexia-lexend.css',
    'dyslexia-opendyslexic': 'styles/dyslexia-opendyslexic.css',
    'contrast-dark': 'styles/theme-high-contrast-dark.css',
    'contrast-light': 'styles/theme-high-contrast-light.css',
    'declutter': 'styles/clean-layout.css',
  };

  const CLASS_MAP = {
    'dyslexia-lexend': 'a11y-dyslexia-lexend',
    'dyslexia-opendyslexic': 'a11y-dyslexia-opendyslexic',
    'contrast-dark': 'a11y-contrast-dark',
    'contrast-light': 'a11y-contrast-light',
    'declutter': 'a11y-declutter',
  };

  const linkEls = {};

  function ensureLink(key) {
    if (linkEls[key]) return linkEls[key];
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL(STYLE_FILES[key]);
    link.dataset.a11yStyle = key;
    (document.head || document.documentElement).appendChild(link);
    linkEls[key] = link;
    return link;
  }

  function setPreset(key, enabled) {
    if (!STYLE_FILES[key]) return;
    ensureLink(key);
    document.documentElement.classList.toggle(CLASS_MAP[key], !!enabled);
  }

  function setFontScale(percent) {
    const root = document.documentElement;
    if (!percent || percent === 100) {
      root.style.removeProperty('--a11y-font-scale');
      root.classList.remove('a11y-font-scaled');
      return;
    }
    root.style.setProperty('--a11y-font-scale', String(percent / 100));
    root.classList.add('a11y-font-scaled');
    injectScaleRuleOnce();
  }

  let scaleRuleInjected = false;
  function injectScaleRuleOnce() {
    if (scaleRuleInjected) return;
    scaleRuleInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      html.a11y-font-scaled body, html.a11y-font-scaled body * {
        font-size: calc(1em * var(--a11y-font-scale, 1)) !important;
      }
    `;
    document.head.appendChild(style);
  }

  function setLineHeight(value) {
    const root = document.documentElement;
    if (!value) {
      root.style.removeProperty('--a11y-line-height');
      root.classList.remove('a11y-line-height-custom');
      return;
    }
    root.style.setProperty('--a11y-line-height', String(value));
    root.classList.add('a11y-line-height-custom');
    injectLineHeightRuleOnce();
  }

  let lineHeightRuleInjected = false;
  function injectLineHeightRuleOnce() {
    if (lineHeightRuleInjected) return;
    lineHeightRuleInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      html.a11y-line-height-custom body, html.a11y-line-height-custom body * {
        line-height: var(--a11y-line-height, 1.8) !important;
      }
    `;
    document.head.appendChild(style);
  }

  function applyState(state) {
    if (!state) return;
    setPreset('dyslexia-lexend', state.dyslexiaFont === 'lexend');
    setPreset('dyslexia-opendyslexic', state.dyslexiaFont === 'opendyslexic');
    setPreset('contrast-dark', state.contrastMode === 'dark');
    setPreset('contrast-light', state.contrastMode === 'light');
    setPreset('declutter', !!state.declutter);
    setFontScale(state.fontScale || 100);
    setLineHeight(state.lineHeight || null);

    if (window.A11yBionic) {
      window.A11yBionic.setEnabled(!!state.bionicReading);
    }
  }

  window.A11yRestyler = { applyState, setPreset, setFontScale, setLineHeight };
})();
