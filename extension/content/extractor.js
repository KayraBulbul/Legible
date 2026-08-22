/* Builds a semantic-HTML snapshot of the live page for saving to the backend. Strips this
   extension's own DOM injections (HUD, bionic-reading wrappers, custom cursor) so a saved
   page reflects the source content, not this extension's UI. The backend re-sanitizes HTML
   server-side, so this only needs to remove extension artifacts, not defend against XSS. */
(function () {
  const STRIP_SELECTORS = ['.a11y-hud', '.a11y-custom-cursor', 'script', 'style', 'noscript', 'iframe', 'form'];
  const MAX_DOC_LENGTH = 1000000;

  function unwrapBionicText(root) {
    root.querySelectorAll('span.a11y-bionic-wrap').forEach((wrapper) => {
      wrapper.replaceWith(document.createTextNode(wrapper.textContent));
    });
  }

  function stripAiPrefix(root) {
    root.querySelectorAll('[alt], [aria-label]').forEach((el) => {
      ['alt', 'aria-label'].forEach((attr) => {
        const value = el.getAttribute(attr);
        if (value && value.startsWith('[AI] ')) {
          el.setAttribute(attr, value.slice(5));
        }
      });
    });
  }

  function pickContentRoot() {
    return document.querySelector('main') || document.querySelector('article') || document.body;
  }

  function cleanClone(sourceRoot) {
    const clone = sourceRoot.cloneNode(true);
    STRIP_SELECTORS.forEach((selector) => {
      clone.querySelectorAll(selector).forEach((el) => el.remove());
    });
    unwrapBionicText(clone);
    stripAiPrefix(clone);
    clone.normalize();
    return clone;
  }

  function extractPage() {
    const root = pickContentRoot();
    if (!root) return { ok: false, reason: 'no-content-root' };

    const clone = cleanClone(root);
    const html = clone.outerHTML.slice(0, MAX_DOC_LENGTH);
    const text = clone.textContent.replace(/\s+/g, ' ').trim().slice(0, MAX_DOC_LENGTH);

    const langRaw = (document.documentElement.lang || '').trim();
    const language = langRaw.length >= 2 ? langRaw : null;
    const title = (document.title || '').trim() || 'Untitled page';

    return {
      ok: true,
      title,
      originalUrl: location.href,
      sourceDocument: { format: 'semantic_html', html, text, language },
    };
  }

  window.A11yExtractor = { extractPage };
})();
