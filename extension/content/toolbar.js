/* Floating on-page accessibility button: clicking it toggles the extension overlay panel */
(function () {
  const Z = 2147483645;
  let btn = null;
  let visible = true;

  function css(el, text) {
    el.style.cssText = text;
  }

  function createButton(onClick) {
    if (btn) return btn;

    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'a11y-toolbar-btn';
    btn.setAttribute('aria-label', 'Open LEGIBLE accessibility settings');
    btn.title = 'Open LEGIBLE settings';

    css(
      btn,
      `position: fixed !important;
       right: 20px !important;
       bottom: 20px !important;
       width: 50px !important;
       height: 50px !important;
       min-width: 50px !important;
       min-height: 50px !important;
       max-width: 50px !important;
       max-height: 50px !important;
       padding: 0 !important;
       margin: 0 !important;
       border-radius: 50% !important;
       border: 2px solid #F57600 !important;
       background: #ffffff !important;
       box-shadow: 0 4px 18px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(245, 118, 0, 0.15) !important;
       cursor: pointer !important;
       z-index: ${Z} !important;
       display: flex !important;
       align-items: center !important;
       justify-content: center !important;
       overflow: hidden !important;
       transition: transform 0.18s ease, box-shadow 0.18s ease !important;
       pointer-events: auto !important;
       opacity: 1 !important;
       outline: none !important;`
    );

    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('icons/icon48.png');
    img.alt = 'LEGIBLE';
    css(
      img,
      `width: 36px !important;
       height: 36px !important;
       display: block !important;
       pointer-events: none !important;
       user-select: none !important;
       border-radius: 50% !important;
       object-fit: contain !important;
       border: none !important;
       margin: 0 !important;
       padding: 0 !important;`
    );

    btn.appendChild(img);

    btn.addEventListener('mouseenter', () => {
      btn.style.setProperty('transform', 'scale(1.1)', 'important');
      btn.style.setProperty('box-shadow', '0 6px 24px rgba(245, 118, 0, 0.4), 0 0 0 2px rgba(245, 118, 0, 0.3)', 'important');
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.setProperty('transform', 'scale(1)', 'important');
      btn.style.setProperty('box-shadow', '0 4px 18px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(245, 118, 0, 0.15)', 'important');
    });

    btn.addEventListener('focus', () => {
      btn.style.setProperty('outline', '3px solid #F57600', 'important');
      btn.style.setProperty('outline-offset', '3px', 'important');
    });

    btn.addEventListener('blur', () => {
      btn.style.setProperty('outline', 'none', 'important');
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onClick) onClick();
      else if (window.A11yPanel) window.A11yPanel.toggle();
    });

    (document.body || document.documentElement).appendChild(btn);
    return btn;
  }

  function setVisible(show) {
    visible = show !== false;
    if (!btn && visible) {
      createButton();
    }
    if (btn) {
      btn.style.setProperty('display', visible ? 'flex' : 'none', 'important');
    }
  }

  function init(opts) {
    const options = opts || {};
    const show = !options.settings || (options.settings.toolbarVisible !== false && options.settings.extensionEnabled !== false);
    if (show) {
      createButton(options.togglePanel);
    }
    setVisible(show);
  }

  window.A11yToolbar = { init, setVisible, getButton: () => btn };
})();
