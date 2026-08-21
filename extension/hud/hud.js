/* Floating on-page accessibility HUD: pill toggle + expandable toolbar */
(function () {
  let root = null;
  let panel = null;
  let statusEl = null;
  let updateSettingFn = null;
  let runAiScanFn = null;
  let expanded = false;

  function el(tag, className, attrs) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  function buildToggle(label, key, onValue, offValue, getActive) {
    const btn = el('button', 'a11y-hud-toggle');
    btn.type = 'button';
    btn.textContent = label;
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      const isActive = btn.getAttribute('aria-pressed') === 'true';
      const nextVal = isActive ? offValue : onValue;
      btn.setAttribute('aria-pressed', String(!isActive));
      btn.classList.toggle('a11y-active', !isActive);
      updateSettingFn({ [key]: nextVal });
    });
    btn.dataset.key = key;
    btn.dataset.onValue = JSON.stringify(onValue);
    return btn;
  }

  function build() {
    root = el('div', 'a11y-hud a11y-hud-root');

    const pill = el('button', 'a11y-hud a11y-hud-pill', { 'aria-label': 'Toggle accessibility toolbar', title: 'Accessibility Toolbar' });
    pill.textContent = '♿';
    pill.addEventListener('click', () => {
      expanded = !expanded;
      panel.classList.toggle('a11y-open', expanded);
    });

    panel = el('div', 'a11y-hud a11y-hud-panel');

    const title = el('div', 'a11y-hud-title');
    title.textContent = 'Accessibility Toolbar';
    panel.appendChild(title);

    const row1 = el('div', 'a11y-hud-row');
    row1.appendChild(buildToggle('Lexend', 'dyslexiaFont', 'lexend', 'none'));
    row1.appendChild(buildToggle('OpenDyslexic', 'dyslexiaFont', 'opendyslexic', 'none'));
    panel.appendChild(row1);

    const row2 = el('div', 'a11y-hud-row');
    row2.appendChild(buildToggle('Dark Contrast', 'contrastMode', 'dark', 'none'));
    row2.appendChild(buildToggle('Warm Contrast', 'contrastMode', 'light', 'none'));
    panel.appendChild(row2);

    const row3 = el('div', 'a11y-hud-row');
    row3.appendChild(buildToggle('De-clutter', 'declutter', true, false));
    row3.appendChild(buildToggle('Bionic Read', 'bionicReading', true, false));
    panel.appendChild(row3);

    const row4 = el('div', 'a11y-hud-row');
    const readBtn = el('button', 'a11y-hud-toggle a11y-hud-primary');
    readBtn.textContent = '▶ Read (Alt+R)';
    readBtn.addEventListener('click', () => {
      window.A11yScreenReader && window.A11yScreenReader.toggleRead();
    });
    row4.appendChild(readBtn);

    const scanBtn = el('button', 'a11y-hud-toggle a11y-hud-primary');
    scanBtn.textContent = '✨ AI Scan Page';
    scanBtn.addEventListener('click', () => {
      runAiScanFn && runAiScanFn();
    });
    row4.appendChild(scanBtn);
    panel.appendChild(row4);

    const row5 = el('div', 'a11y-hud-row');
    const prevBtn = el('button', 'a11y-hud-toggle');
    prevBtn.textContent = '⏮ Prev (Alt+P)';
    prevBtn.addEventListener('click', () => window.A11yScreenReader && window.A11yScreenReader.prev());
    const nextBtn = el('button', 'a11y-hud-toggle');
    nextBtn.textContent = 'Next ⏭ (Alt+N)';
    nextBtn.addEventListener('click', () => window.A11yScreenReader && window.A11yScreenReader.next());
    row5.appendChild(prevBtn);
    row5.appendChild(nextBtn);
    panel.appendChild(row5);

    statusEl = el('div', 'a11y-hud-status');
    statusEl.textContent = 'Ready.';
    panel.appendChild(statusEl);

    root.appendChild(panel);
    root.appendChild(pill);
    document.documentElement.appendChild(root);
  }

  function syncState(settings) {
    if (!panel) return;
    panel.querySelectorAll('.a11y-hud-toggle[data-key]').forEach((btn) => {
      const key = btn.dataset.key;
      const onValue = JSON.parse(btn.dataset.onValue);
      const isActive = settings[key] === onValue;
      btn.setAttribute('aria-pressed', String(isActive));
      btn.classList.toggle('a11y-active', isActive);
    });
  }

  function setVisible(visible) {
    if (!root) return;
    root.style.display = visible ? '' : 'none';
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function init(opts) {
    updateSettingFn = opts.updateSetting;
    runAiScanFn = opts.runAiScan;
    if (!root) build();
    syncState(opts.settings);
    setVisible(opts.settings.hudVisible !== false);
  }

  window.A11yHud = { init, syncState, setVisible, setStatus };
})();
