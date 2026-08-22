/* Customizable on-page cursor: replaces the native pointer with a larger, colorable follower */
(function () {
  let dotEl = null;
  let enabled = false;
  let style = 'ring';
  let size = 32;
  let color = '#5b3cdc';
  let rafId = null;
  let lastX = 0;
  let lastY = 0;

  function ensureEl() {
    if (dotEl) return dotEl;
    dotEl = document.createElement('div');
    dotEl.className = 'a11y-custom-cursor';
    document.documentElement.appendChild(dotEl);
    return dotEl;
  }

  function applyStyle() {
    const el = ensureEl();
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.dataset.style = style;
    el.style.setProperty('--a11y-cursor-color', color);
  }

  function onMove(e) {
    lastX = e.clientX;
    lastY = e.clientY;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (dotEl) dotEl.style.transform = `translate(${lastX}px, ${lastY}px) translate(-50%, -50%)`;
    });
  }

  function setState(opts) {
    const wasEnabled = enabled;
    enabled = !!opts.enabled;
    style = opts.style || style;
    size = opts.size || size;
    color = opts.color || color;

    if (enabled) {
      applyStyle();
      ensureEl().style.display = 'block';
      document.documentElement.classList.add('a11y-cursor-hidden');
      if (!wasEnabled) document.addEventListener('mousemove', onMove, { passive: true });
    } else {
      document.documentElement.classList.remove('a11y-cursor-hidden');
      if (dotEl) dotEl.style.display = 'none';
      if (wasEnabled) document.removeEventListener('mousemove', onMove);
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }
  }

  window.A11yCursor = { setState };
})();
