/* A11y Restyler Engine: injects theme stylesheets and toggles presets on <html> */
(function () {
  const STYLE_FILES = {
    'dyslexia-lexend': 'styles/dyslexia-lexend.css',
    'dyslexia-opendyslexic': 'styles/dyslexia-opendyslexic.css',
    'font-arial': 'styles/font-arial.css',
    'font-atkinson': 'styles/font-atkinson.css',
    'font-verdana': 'styles/font-verdana.css',
    'font-opensans': 'styles/font-opensans.css',
    'font-comicsans': 'styles/font-comicsans.css',
    'theme-invert': 'styles/theme-invert.css',
    'theme-dark': 'styles/theme-dark.css',
    'theme-light': 'styles/theme-light.css',
    'theme-contrast': 'styles/theme-high-contrast-dark.css',
    'declutter': 'styles/clean-layout.css',
    'pause-animations': 'styles/pause-animations.css',
    'highlight-links': 'styles/highlight-links.css',
    'hide-images': 'styles/hide-images.css',
  };

  const CLASS_MAP = {
    'dyslexia-lexend': 'a11y-dyslexia-lexend',
    'dyslexia-opendyslexic': 'a11y-dyslexia-opendyslexic',
    'font-arial': 'a11y-font-arial',
    'font-atkinson': 'a11y-font-atkinson',
    'font-verdana': 'a11y-font-verdana',
    'font-opensans': 'a11y-font-opensans',
    'font-comicsans': 'a11y-font-comicsans',
    'theme-invert': 'a11y-theme-invert',
    'theme-dark': 'a11y-theme-dark',
    'theme-light': 'a11y-theme-light',
    'theme-contrast': 'a11y-contrast-dark',
    'declutter': 'a11y-declutter',
    'pause-animations': 'a11y-pause-animations',
    'highlight-links': 'a11y-highlight-links',
    'hide-images': 'a11y-hide-images',
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

  function setLetterSpacing(value) {
    const root = document.documentElement;
    if (!value) {
      root.style.removeProperty('--a11y-letter-spacing');
      root.classList.remove('a11y-letter-spacing-custom');
      return;
    }
    root.style.setProperty('--a11y-letter-spacing', `${value}em`);
    root.classList.add('a11y-letter-spacing-custom');
    injectLetterSpacingRuleOnce();
  }

  let letterSpacingRuleInjected = false;
  function injectLetterSpacingRuleOnce() {
    if (letterSpacingRuleInjected) return;
    letterSpacingRuleInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      html.a11y-letter-spacing-custom body, html.a11y-letter-spacing-custom body * {
        letter-spacing: var(--a11y-letter-spacing, 0) !important;
      }
    `;
    document.head.appendChild(style);
  }

  /* Pause Animations, script half.

     The stylesheet handles CSS keyframes and transitions declaratively. These helpers
     cover the three things CSS cannot reach: Web Animations API animations started with
     element.animate(), SVG SMIL (<animate>, <animateTransform>), and media that only
     begins playing after the toggle was flipped. */

  let pauseAnimationsOn = false;
  // Only animations this extension paused are resumed later, so a toggle-off never starts
  // something the page had deliberately paused on its own.
  const pausedAnimations = new Set();
  let motionObserver = null;
  let motionSweepTimer = null;

  function pauseWebAnimations() {
    if (typeof document.getAnimations !== 'function') return;
    document.getAnimations().forEach((anim) => {
      if (anim.playState !== 'running' || pausedAnimations.has(anim)) return;
      try {
        anim.pause();
        pausedAnimations.add(anim);
      } catch (e) {
        // pause() throws InvalidStateError on an infinite animation with no resolved time.
      }
    });
  }

  function resumeWebAnimations() {
    pausedAnimations.forEach((anim) => {
      try {
        if (anim.playState === 'paused') anim.play();
      } catch (e) {
        /* animation may have been cancelled with the element that owned it */
      }
    });
    pausedAnimations.clear();
  }

  function setSvgAnimations(paused) {
    document.querySelectorAll('svg').forEach((svg) => {
      // SVGSVGElement only; an inline <svg> in an unsupported engine has no timeline.
      if (typeof svg.pauseAnimations !== 'function') return;
      try {
        if (paused) svg.pauseAnimations();
        else svg.unpauseAnimations();
      } catch (e) {
        /* ignore */
      }
    });
  }

  function pauseMedia() {
    document.querySelectorAll('video, audio').forEach((m) => {
      try { m.pause(); } catch (e) { /* ignore */ }
    });
  }

  function sweepMotion() {
    pauseWebAnimations();
    setSvgAnimations(true);
    pauseMedia();
  }

  // A childList observer cannot see an animation started on an element that was already in
  // the DOM, so mutations trigger a full re-sweep rather than a scan of the added nodes.
  // Debounced because script-heavy pages mutate in bursts.
  function scheduleMotionSweep() {
    if (motionSweepTimer !== null) return;
    motionSweepTimer = setTimeout(() => {
      motionSweepTimer = null;
      if (pauseAnimationsOn) sweepMotion();
    }, 200);
  }

  function startMotionObserver() {
    if (motionObserver) return;
    motionObserver = new MutationObserver(scheduleMotionSweep);
    motionObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  function stopMotionObserver() {
    if (motionObserver) {
      motionObserver.disconnect();
      motionObserver = null;
    }
    if (motionSweepTimer !== null) {
      clearTimeout(motionSweepTimer);
      motionSweepTimer = null;
    }
  }

  // `play` does not bubble, so this listens in the capture phase to catch media that
  // autoplays, gets restarted by the page, or arrives with infinite scroll.
  document.addEventListener(
    'play',
    (e) => {
      if (!pauseAnimationsOn) return;
      const el = e.target;
      if (el && (el.tagName === 'VIDEO' || el.tagName === 'AUDIO')) {
        try { el.pause(); } catch (err) { /* ignore */ }
      }
    },
    true
  );

  function setPauseAnimations(enabled) {
    setPreset('pause-animations', enabled);
    const wasOn = pauseAnimationsOn;
    pauseAnimationsOn = !!enabled;

    if (pauseAnimationsOn) {
      sweepMotion();
      startMotionObserver();
    } else if (wasOn) {
      // Restore only on a real on->off flip. applyState() re-runs on every settings
      // change, and unpausing unconditionally would resume SVG timelines the page had
      // paused itself.
      stopMotionObserver();
      resumeWebAnimations();
      setSvgAnimations(false);
      // Media stays paused on purpose. Silently resuming video or audio the user did not
      // restart themselves is a worse surprise than leaving it stopped.
    }
  }

  function applyState(state) {
    if (!state) return;
    const font = state.dyslexiaFont || 'none';
    setPreset('dyslexia-lexend', font === 'lexend' || font === 'dyslexia-lexend');
    setPreset('dyslexia-opendyslexic', font === 'opendyslexic' || font === 'dyslexia-opendyslexic');
    setPreset('font-arial', font === 'arial' || font === 'font-arial');
    setPreset('font-atkinson', font === 'atkinson' || font === 'font-atkinson');
    setPreset('font-verdana', font === 'verdana' || font === 'font-verdana');
    setPreset('font-opensans', font === 'opensans' || font === 'font-opensans');
    setPreset('font-comicsans', font === 'comicsans' || font === 'font-comicsans');

    const theme = state.themeMode || 'none';
    setPreset('theme-invert', theme === 'invert');
    setPreset('theme-dark', theme === 'dark');
    setPreset('theme-light', theme === 'light');
    setPreset('theme-contrast', theme === 'contrast');

    setPreset('declutter', !!state.declutter);
    setPauseAnimations(!!state.pauseAnimations);
    setPreset('highlight-links', !!state.highlightLinks);
    setPreset('hide-images', !!state.hideImages);

    setFontScale(state.fontScale || 100);
    setLineHeight(state.lineHeight || null);
    setLetterSpacing(state.letterSpacing || 0);

    if (window.A11yBionic) {
      window.A11yBionic.setEnabled(!!state.bionicReading);
    }

    if (window.A11yCursor) {
      window.A11yCursor.setState({
        enabled: !!state.cursorEnabled,
        style: state.cursorStyle || 'ring',
        size: state.cursorSize || 32,
        color: state.cursorColor || '#5b3cdc',
      });
    }
  }

  window.A11yRestyler = { applyState, setPreset, setFontScale, setLineHeight, setLetterSpacing };
})();
