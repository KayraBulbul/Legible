/* Floating settings panel: hosts sidebar/sidebar.html in an overlay iframe.

   It deliberately does NOT use Chrome's side panel, which reserves browser chrome and
   reflows the page. It is also not docked to the viewport edge: it floats as a detached
   rounded card inset from the corner, so it reads as a panel over the page rather than a
   sidebar attached to it. Either way the site underneath keeps its full width.

   Every rule is written inline with !important because the host page's own stylesheet
   could otherwise match the container (e.g. a blanket `iframe { width: 100% }`). */
(function () {
  const PANEL_WIDTH = 372;
  const INSET = 16;
  const Z = 2147483646;

  let host = null;
  let frame = null;
  let open = false;

  function css(el, text) {
    el.style.cssText = text;
  }

  function build() {
    host = document.createElement('div');
    host.className = 'a11y-panel-host';
    css(
      host,
      `position: fixed !important;
       top: ${INSET}px !important;
       right: ${INSET}px !important;
       bottom: auto !important;
       left: auto !important;
       width: ${PANEL_WIDTH}px !important;
       max-width: calc(100vw - ${INSET * 2}px) !important;
       height: min(760px, calc(100vh - ${INSET * 2}px)) !important;
       max-height: calc(100vh - ${INSET * 2}px) !important;
       margin: 0 !important;
       padding: 0 !important;
       border: 1px solid rgba(120, 120, 128, 0.2) !important;
       border-radius: 14px !important;
       overflow: hidden !important;
       background: transparent !important;
       z-index: ${Z} !important;
       transform: translateX(calc(100% + ${INSET * 2}px));
       transition: transform 0.22s ease;
       box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28) !important;
       pointer-events: auto !important;
       visibility: hidden;`
    );

    frame = document.createElement('iframe');
    frame.src = chrome.runtime.getURL('sidebar/sidebar.html');
    frame.title = 'Web Accessibility settings';
    // The panel is cross-origin to the page hosting it, and `clipboard-write` defaults to
    // `self` - without this delegation the async clipboard API is denied outright, which is
    // what the "Copy" button next to a pairing code needs.
    frame.allow = 'clipboard-write';
    css(
      frame,
      `display: block !important;
       width: 100% !important;
       height: 100% !important;
       min-width: 0 !important;
       min-height: 0 !important;
       max-width: none !important;
       max-height: none !important;
       margin: 0 !important;
       padding: 0 !important;
       border: none !important;
       border-radius: 14px !important;
       background: transparent !important;
       opacity: 1 !important;
       filter: none !important;`
    );

    host.appendChild(frame);
    (document.body || document.documentElement).appendChild(host);
  }

  function setOpen(next) {
    if (!host) build();
    open = !!next;
    host.style.setProperty('visibility', open ? 'visible' : 'hidden');
    host.style.setProperty('transform', open ? 'translateX(0)' : `translateX(calc(100% + ${INSET * 2}px))`);
  }

  function toggle() {
    setOpen(!open);
    return open;
  }

  // The panel's own header buttons talk back through postMessage; only accept messages
  // that actually came from our iframe.
  window.addEventListener('message', (event) => {
    if (!frame || event.source !== frame.contentWindow) return;
    if (!event.data || event.data.type !== 'A11Y_PANEL_CLOSE') return;
    setOpen(false);
  });

  window.A11yPanel = { toggle, setOpen, isOpen: () => open };
})();
