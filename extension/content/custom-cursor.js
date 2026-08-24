/* Customizable on-page cursor: replaces the native pointer with a larger, colorable follower.

   The visuals live inside a shadow root. That is not decoration: the cursor is injected into
   arbitrary pages, and CSS aimed at ordinary page content used to land on it — the extension's
   own Hide Images preset (`svg { visibility: hidden !important }`) blanked the arrow, and the
   dark/contrast themes re-filtered it. A shadow root cannot be selected into from the page's
   stylesheets, so only the host box is exposed and only inherited properties can reach in. */
(function () {
  let hostEl = null;
  let shapeEl = null;
  let enabled = false;
  let style = 'ring';
  let size = 32;
  let color = '#f97316';
  let rafId = null;
  let lastX = 0;
  let lastY = 0;
  let positioned = false;

  // The arrow is drawn with its tip at the viewBox origin, so it hangs off the pointer
  // position exactly like a native cursor. Every other style is centred on the pointer.
  const ARROW_PATH = 'M0 0 L0 17.5 L4.6 13.4 L7.6 20.3 L11 18.8 L8.1 12.2 L14.3 11.8 Z';

  const SHADOW_CSS = `
    :host { display: block; }
    .shape {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      position: relative;
    }
    .shape[data-style="ring"] {
      border: 3px solid var(--a11y-cursor-color, #f97316);
      border-radius: 50%;
    }
    .shape[data-style="dot"] {
      background: var(--a11y-cursor-color, #f97316);
      border-radius: 50%;
    }
    .shape[data-style="crosshair"]::before,
    .shape[data-style="crosshair"]::after {
      content: '';
      position: absolute;
      background: var(--a11y-cursor-color, #f97316);
    }
    .shape[data-style="crosshair"]::before {
      left: 50%;
      top: 0;
      bottom: 0;
      width: 2px;
      transform: translateX(-50%);
    }
    .shape[data-style="crosshair"]::after {
      top: 50%;
      left: 0;
      right: 0;
      height: 2px;
      transform: translateY(-50%);
    }
    .shape[data-style="arrow"] {
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
    }
    .shape svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .shape path {
      fill: var(--a11y-cursor-color, #f97316);
      stroke: var(--a11y-cursor-outline, #ffffff);
      stroke-width: 1.4;
      stroke-linejoin: round;
    }
  `;

  function anchorTransform() {
    return style === 'arrow' ? '' : ' translate(-50%, -50%)';
  }

  // A native cursor stays legible on any background because it is outlined. Pick the
  // outline from the fill's luminance so light palette colours get a dark edge.
  function outlineFor(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return '#ffffff';
    const n = parseInt(m[1], 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.62 ? '#1c1c1e' : '#ffffff';
  }

  function ensureEl() {
    if (hostEl) return hostEl;
    hostEl = document.createElement('div');
    hostEl.className = 'a11y-custom-cursor';

    const shadow = hostEl.attachShadow({ mode: 'open' });
    const sheet = document.createElement('style');
    sheet.textContent = SHADOW_CSS;
    shapeEl = document.createElement('div');
    shapeEl.className = 'shape';
    shadow.appendChild(sheet);
    shadow.appendChild(shapeEl);

    document.documentElement.appendChild(hostEl);
    return hostEl;
  }

  function applyStyle() {
    const el = ensureEl();
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    // Colours travel as custom properties: they are inherited, so they cross into the
    // shadow tree where the shape rules consume them.
    el.style.setProperty('--a11y-cursor-color', color);
    el.style.setProperty('--a11y-cursor-outline', outlineFor(color));

    shapeEl.dataset.style = style;
    if (style === 'arrow') {
      if (!shapeEl.firstChild) {
        shapeEl.innerHTML =
          `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${ARROW_PATH}" /></svg>`;
      }
    } else if (shapeEl.firstChild) {
      shapeEl.textContent = '';
    }
  }

  function place() {
    if (!hostEl) return;
    hostEl.style.transform = `translate(${lastX}px, ${lastY}px)${anchorTransform()}`;
    // Stays hidden until the pointer has actually reported a position, otherwise the
    // cursor would sit parked in the page's top-left corner looking like a stray graphic.
    if (positioned) hostEl.style.visibility = 'visible';
  }

  function onMove(e) {
    lastX = e.clientX;
    lastY = e.clientY;
    // The very first move paints synchronously so the cursor appears the instant the
    // pointer enters the page; later moves are coalesced into an animation frame.
    if (!positioned) {
      positioned = true;
      place();
      return;
    }
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      place();
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
      // Re-render at the last known position so a settings change (size, colour, look)
      // takes effect immediately instead of waiting for the next mouse movement.
      place();
      document.documentElement.classList.add('a11y-cursor-hidden');
      if (!wasEnabled) document.addEventListener('mousemove', onMove, { passive: true });
    } else {
      document.documentElement.classList.remove('a11y-cursor-hidden');
      if (hostEl) hostEl.style.display = 'none';
      if (wasEnabled) document.removeEventListener('mousemove', onMove);
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }
  }

  window.A11yCursor = { setState };
})();
