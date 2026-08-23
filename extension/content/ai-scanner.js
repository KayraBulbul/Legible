/* AI Semantic Enricher: finds unlabeled images/icons/canvases and requests Gemini analysis */
(function () {
  const processed = new WeakSet();
  const MAX_PER_SCAN = 40;

  function isPlaceholderAlt(alt) {
    if (alt == null) return true;
    const t = alt.trim().toLowerCase();
    return t === '' || t === 'image' || t === 'photo' || t === 'icon' || t === 'picture' || t === 'untitled';
  }

  function findUnlabeledImages(root) {
    const imgs = Array.from(root.querySelectorAll('img'));
    return imgs.filter((img) => !processed.has(img) && isPlaceholderAlt(img.getAttribute('alt')) && img.src);
  }

  function findIconButtons(root) {
    const candidates = Array.from(root.querySelectorAll('button, a, [role="button"]'));
    return candidates.filter((el) => {
      if (processed.has(el)) return false;
      const hasAria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
      const hasText = el.textContent && el.textContent.trim().length > 0;
      const hasTitle = el.getAttribute('title');
      if (hasAria || hasText || hasTitle) return false;
      const hasIcon = el.querySelector('svg, img, i[class*="icon"], span[class*="icon"]');
      return !!hasIcon;
    });
  }

  function findCanvases(root) {
    return Array.from(root.querySelectorAll('canvas')).filter(
      (c) => !processed.has(c) && !c.getAttribute('aria-label') && c.width > 40 && c.height > 40
    );
  }

  async function toBase64FromUrl(url) {
    try {
      const resp = await fetch(url, { mode: 'cors' });
      const blob = await resp.blob();
      if (!blob.type.startsWith('image/')) return null;
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return null;
    }
  }

  function canvasToBase64(canvas) {
    try {
      return canvas.toDataURL('image/png');
    } catch (e) {
      return null;
    }
  }

  function markBadge(el, ok) {
    el.classList.add(ok ? 'a11y-ai-labeled' : 'a11y-ai-failed');
  }

  async function analyzeAndApply(el, kind) {
    processed.add(el);
    let dataUrl = null;
    let sourceKey = null;

    if (kind === 'img') {
      sourceKey = el.src;
      dataUrl = await toBase64FromUrl(el.src);
    } else if (kind === 'canvas') {
      sourceKey = 'canvas:' + (el.id || Math.random().toString(36).slice(2));
      dataUrl = canvasToBase64(el);
    } else if (kind === 'icon-button') {
      const innerImg = el.querySelector('img');
      const innerSvg = el.querySelector('svg');
      if (innerImg && innerImg.src) {
        sourceKey = innerImg.src;
        dataUrl = await toBase64FromUrl(innerImg.src);
      } else if (innerSvg) {
        sourceKey = 'svg:' + (el.outerHTML || '').slice(0, 200);
        try {
          const svgString = new XMLSerializer().serializeToString(innerSvg);
          dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
        } catch (e) {
          dataUrl = null;
        }
      }
    }

    if (!dataUrl) {
      markBadge(el, false);
      return { ok: false, reason: 'no-image-data' };
    }

    let response;
    try {
      response = await chrome.runtime.sendMessage({
        type: 'AI_ANALYZE_IMAGE',
        payload: { dataUrl, kind, cacheKey: sourceKey, pageUrl: location.href },
      });
    } catch (e) {
      markBadge(el, false);
      return { ok: false, reason: 'message-failed' };
    }

    if (!response || !response.ok) {
      markBadge(el, false);
      return { ok: false, reason: (response && response.error) || 'unknown' };
    }

    const { altText, role } = response.result;
    applyResult(el, kind, altText, role);
    markBadge(el, true);
    return { ok: true, altText, role };
  }

  function applyResult(el, kind, altText, role) {
    const text = `[AI] ${altText}`;
    if (kind === 'img') {
      el.setAttribute('alt', text);
      el.setAttribute('title', text);
    } else {
      el.setAttribute('aria-label', text);
      el.setAttribute('title', text);
      if (role && !el.getAttribute('role')) el.setAttribute('role', role);
    }
  }

  async function scanPage(root = document.body) {
    const images = findUnlabeledImages(root).slice(0, MAX_PER_SCAN);
    const icons = findIconButtons(root).slice(0, MAX_PER_SCAN);
    const canvases = findCanvases(root).slice(0, MAX_PER_SCAN);

    const tasks = [
      ...images.map((el) => ({ el, kind: 'img' })),
      ...icons.map((el) => ({ el, kind: 'icon-button' })),
      ...canvases.map((el) => ({ el, kind: 'canvas' })),
    ];

    const results = [];
    for (const task of tasks) {
      // eslint-disable-next-line no-await-in-loop
      const res = await analyzeAndApply(task.el, task.kind);
      results.push({ kind: task.kind, ...res });
    }
    return { scanned: tasks.length, results };
  }

  function revertLabels(root = document.body) {
    if (!root) return;
    root.querySelectorAll('.a11y-ai-labeled, .a11y-ai-failed').forEach((el) => {
      el.classList.remove('a11y-ai-labeled', 'a11y-ai-failed');
      ['alt', 'aria-label', 'title'].forEach((attr) => {
        const val = el.getAttribute(attr);
        if (val && val.startsWith('[AI] ')) {
          const original = val.slice(5).trim();
          if (original) el.setAttribute(attr, original);
          else el.removeAttribute(attr);
        }
      });
    });
  }

  window.A11yScanner = { scanPage, scanSingleElement, findUnlabeledImages, findIconButtons, findCanvases, revertLabels };
})();
