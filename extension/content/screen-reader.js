/* Screen Reader & Interactive TTS Navigator: Web Speech API + keyboard focus traversal */
(function () {
  const READABLE_SELECTOR =
    'h1, h2, h3, h4, h5, h6, p, li, a[href], button, label, blockquote, figcaption, td, th, [role="heading"], [role="button"], [role="link"]';

  let elements = [];
  let currentIndex = -1;
  let isReading = false;
  let settings = { rate: 1, pitch: 1, voiceURI: null };
  let highlightBox = null;
  let subtitleBanner = null;

  function isVisible(el) {
    if (!el || !(el instanceof Element)) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity) === 0) return false;
    return true;
  }

  function hasDirectText(el) {
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim().length > 0) return true;
    }
    return el.tagName === 'A' || el.tagName === 'BUTTON' || el.tagName === 'IMG';
  }

  function buildElementList() {
    const all = Array.from(document.querySelectorAll(READABLE_SELECTOR));
    elements = all.filter((el) => {
      if (el.closest('.a11y-hud')) return false;
      if (!isVisible(el)) return false;
      const text = getReadableText(el);
      return text && text.trim().length > 1;
    });
  }

  function getReadableText(el) {
    if (el.tagName === 'IMG') return el.getAttribute('alt') || el.getAttribute('title') || '';
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    return el.textContent.replace(/\s+/g, ' ').trim();
  }

  function ensureOverlay() {
    if (highlightBox) return;
    highlightBox = document.createElement('div');
    highlightBox.className = 'a11y-hud a11y-highlight-box';
    document.documentElement.appendChild(highlightBox);

    subtitleBanner = document.createElement('div');
    subtitleBanner.className = 'a11y-hud a11y-subtitle-banner';
    document.documentElement.appendChild(subtitleBanner);
  }

  function positionHighlight(el) {
    ensureOverlay();
    const rect = el.getBoundingClientRect();
    highlightBox.style.top = `${rect.top + window.scrollY - 4}px`;
    highlightBox.style.left = `${rect.left + window.scrollX - 4}px`;
    highlightBox.style.width = `${rect.width + 8}px`;
    highlightBox.style.height = `${rect.height + 8}px`;
    highlightBox.classList.add('a11y-active');
  }

  function clearHighlight() {
    if (highlightBox) highlightBox.classList.remove('a11y-active');
    if (subtitleBanner) subtitleBanner.classList.remove('a11y-active');
  }

  function setSubtitle(text) {
    ensureOverlay();
    subtitleBanner.textContent = text;
    subtitleBanner.classList.add('a11y-active');
  }

  function pickVoice() {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    if (settings.voiceURI) {
      const match = voices.find((v) => v.voiceURI === settings.voiceURI);
      if (match) return match;
    }
    return voices.find((v) => v.default) || voices[0];
  }

  function speakElement(el) {
    window.speechSynthesis.cancel();
    const text = getReadableText(el);
    if (!text) {
      advanceAfterSpeak();
      return;
    }
    positionHighlight(el);
    setSubtitle(text.length > 220 ? text.slice(0, 217) + '...' : text);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    const voice = pickVoice();
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      if (isReading) advanceAfterSpeak();
    };
    utterance.onerror = () => {
      if (isReading) advanceAfterSpeak();
    };

    window.speechSynthesis.speak(utterance);
  }

  function advanceAfterSpeak() {
    if (currentIndex < elements.length - 1) {
      currentIndex += 1;
      speakElement(elements[currentIndex]);
    } else {
      stopReading();
    }
  }

  function ensureListFresh() {
    if (elements.length === 0) buildElementList();
  }

  function startReading() {
    ensureListFresh();
    if (!elements.length) return;
    isReading = true;
    if (currentIndex < 0) currentIndex = 0;
    speakElement(elements[currentIndex]);
  }

  function stopReading() {
    isReading = false;
    window.speechSynthesis.cancel();
    clearHighlight();
  }

  function toggleRead() {
    if (isReading) stopReading();
    else startReading();
  }

  function next() {
    ensureListFresh();
    if (!elements.length) return;
    currentIndex = Math.min(currentIndex + 1, elements.length - 1);
    if (isReading) speakElement(elements[currentIndex]);
    else {
      positionHighlight(elements[currentIndex]);
      setSubtitle(getReadableText(elements[currentIndex]));
      elements[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function prev() {
    ensureListFresh();
    if (!elements.length) return;
    currentIndex = Math.max(currentIndex - 1, 0);
    if (isReading) speakElement(elements[currentIndex]);
    else {
      positionHighlight(elements[currentIndex]);
      setSubtitle(getReadableText(elements[currentIndex]));
      elements[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function updateSettings(next) {
    settings = { ...settings, ...next };
  }

  function getFocusedOrHoveredImage() {
    const active = document.activeElement;
    if (active && (active.tagName === 'IMG' || active.tagName === 'CANVAS')) return active;
    if (window.__a11yLastHovered) return window.__a11yLastHovered;
    return null;
  }

  document.addEventListener(
    'mouseover',
    (e) => {
      const target = e.target;
      if (target && (target.tagName === 'IMG' || target.tagName === 'CANVAS')) {
        window.__a11yLastHovered = target;
      }
    },
    { passive: true }
  );

  window.speechSynthesis.onvoiceschanged = () => {};

  window.A11yScreenReader = {
    toggleRead,
    startReading,
    stopReading,
    next,
    prev,
    updateSettings,
    getFocusedOrHoveredImage,
    isReading: () => isReading,
    rebuild: buildElementList,
  };
})();
