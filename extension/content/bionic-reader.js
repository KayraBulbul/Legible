/* Bionic Reading Mode: bolds the leading letters of each word to guide eye fixations */
(function () {
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SVG', 'CODE', 'PRE', 'IFRAME']);
  const processedNodes = new WeakSet();
  const originalText = new WeakMap();
  let enabled = false;
  let observer = null;

  function boldPrefixLength(word) {
    const len = word.length;
    if (len <= 1) return len;
    if (len <= 3) return 1;
    return Math.ceil(len * 0.5);
  }

  function bionicFragmentFor(text) {
    const frag = document.createDocumentFragment();
    const parts = text.split(/(\s+)/);
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(part));
        continue;
      }
      const boldLen = boldPrefixLength(part);
      if (boldLen > 0) {
        const b = document.createElement('b');
        b.className = 'a11y-bionic-strong';
        b.textContent = part.slice(0, boldLen);
        frag.appendChild(b);
      }
      if (boldLen < part.length) {
        frag.appendChild(document.createTextNode(part.slice(boldLen)));
      }
    }
    return frag;
  }

  function shouldSkip(el) {
    if (!el) return true;
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.isContentEditable) return true;
    if (el.closest && el.closest('.a11y-bionic-strong, .a11y-highlight-box, .a11y-subtitle-banner')) return true;
    return false;
  }

  function processTextNode(node) {
    if (processedNodes.has(node)) return;
    const parent = node.parentElement;
    if (shouldSkip(parent)) return;
    const text = node.nodeValue;
    if (!text || !text.trim()) return;
    processedNodes.add(node);
    originalText.set(node, text);
    const frag = bionicFragmentFor(text);
    const wrapper = document.createElement('span');
    wrapper.className = 'a11y-bionic-wrap';
    wrapper.appendChild(frag);
    node.replaceWith(wrapper);
  }

  function walk(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (shouldSkip(n.parentElement)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(processTextNode);
  }

  function revertAll() {
    document.querySelectorAll('span.a11y-bionic-wrap').forEach((wrapper) => {
      wrapper.replaceWith(document.createTextNode(wrapper.textContent));
    });
    document.body.normalize();
  }

  function setEnabled(next) {
    if (next === enabled) return;
    enabled = next;
    if (enabled) {
      walk(document.body);
      observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          m.addedNodes.forEach((added) => {
            if (added.nodeType === Node.TEXT_NODE) processTextNode(added);
            else if (added.nodeType === Node.ELEMENT_NODE && !shouldSkip(added)) walk(added);
          });
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      if (observer) observer.disconnect();
      revertAll();
    }
  }

  window.A11yBionic = { setEnabled };
})();
