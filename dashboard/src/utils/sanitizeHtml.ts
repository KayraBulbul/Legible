import DOMPurify from "dompurify";

/**
 * Forces every link to open safely instead of trusting the source page —
 * docs/api.md ("Rendering saved content") requires external links not be
 * able to control the dashboard window. Images get the same no-referrer
 * treatment: remote image handling is still an open decision in the
 * contract, so the safe default is not leaking the viewer to whatever host
 * a saved page's `<img>` points at.
 */
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A" && node.hasAttribute("href")) {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
  if (node.tagName === "IMG") {
    node.setAttribute("referrerpolicy", "no-referrer");
    node.setAttribute("loading", "lazy");
  }
});

/**
 * The dashboard's one sanitisation pass before saved-page HTML touches the
 * DOM (docs/api.md, "Rendering saved content"). The backend sanitises too,
 * but clients must still treat stored HTML as untrusted; inline `style` is
 * stripped so the source page can never override the reader's own
 * accessibility styling.
 */
export default function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: [
      "script",
      "style",
      "iframe",
      "form",
      "object",
      "embed",
      "input",
      "button",
      "textarea",
      "select",
    ],
    FORBID_ATTR: ["style"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#)/i,
  });
}
