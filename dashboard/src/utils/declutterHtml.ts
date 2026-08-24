/**
 * Trims presentational noise from saved-article HTML — nav/social/cookie/ad
 * chrome that occasionally survives backend extraction, plus images (this is
 * a text-only reading mode) — without touching anything that could be
 * article prose. This is deliberately conservative: an element is only ever
 * dropped when it's unambiguously non-prose (`<nav>`, `<img>`), explicitly
 * labelled as chrome (a `navigation`/`banner`/`complementary`/`contentinfo`
 * role, or a class/id naming it as an ad/share/cookie/sidebar widget), or
 * left carrying no text and no meaningful child once those two passes are
 * done. It never inspects tag semantics like `<aside>` or `<footer>` alone —
 * both are legitimate inside real article bodies (pull quotes, author
 * bylines) — so those only go when independently flagged. Removing an image
 * can leave a wrapping `<figure>` with only its `<figcaption>` text left —
 * that text survives, since only the image itself is unambiguous.
 *
 * Distinct from sanitizeHtml: that's the security gate (strips scripts,
 * dangerous attributes, unsafe URLs) and always runs last, right before
 * render. This runs earlier and is about readability, not safety.
 */

/** Tags that are never kept, regardless of attributes: page chrome plus all images. */
const ALWAYS_REMOVED_TAGS = new Set([
  "nav",
  "noscript",
  "template",
  "img",
  "picture",
  "source",
]);

/** ARIA landmark roles that mark an element as page chrome. */
const CLUTTER_ROLES = new Set([
  "navigation",
  "banner",
  "complementary",
  "contentinfo",
  "search",
]);

/** class/id name-parts (split on whitespace/hyphen/underscore) that flag an element as chrome. */
const CLUTTER_NAME_TOKENS = new Set([
  "ad",
  "ads",
  "advert",
  "adverts",
  "advertisement",
  "adsbygoogle",
  "sponsor",
  "sponsored",
  "promo",
  "promotion",
  "popup",
  "modal",
  "overlay",
  "newsletter",
  "subscribe",
  "subscription",
  "cookie",
  "cookies",
  "consent",
  "gdpr",
  "breadcrumb",
  "breadcrumbs",
  "pagination",
  "pager",
  "share",
  "sharing",
  "social",
  "comment",
  "comments",
  "sidebar",
  "widget",
  "related",
  "recommended",
  "trending",
  "toc",
  "toolbox",
  "portlet",
  "dropdown",
  "languages",
  "appearance",
  "printfooter",
  "catlinks",
  "navbox",
  "hatnote",
  "editsection",
]);

/**
 * Tags whose presence makes an otherwise-textless element meaningful, not
 * empty clutter. Images aren't listed here — they're gone by the time this
 * runs, stripped outright in the first pass — so this only covers other
 * non-text media the empty-pruning pass must not treat as clutter.
 */
const MEANINGFUL_EMPTY_TAGS = new Set([
  "video",
  "audio",
  "track",
  "iframe",
  "canvas",
  "svg",
  "embed",
  "object",
  "br",
  "hr",
  "table",
  "col",
  "colgroup",
]);
const MEANINGFUL_EMPTY_SELECTOR = Array.from(MEANINGFUL_EMPTY_TAGS).join(",");

function isFlaggedAsClutter(el: Element): boolean {
  if (ALWAYS_REMOVED_TAGS.has(el.tagName.toLowerCase())) return true;

  const role = el.getAttribute("role")?.toLowerCase();
  if (role && CLUTTER_ROLES.has(role)) return true;

  const names = `${el.getAttribute("class") ?? ""} ${el.getAttribute("id") ?? ""}`
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean);
  return names.some((name) => CLUTTER_NAME_TOKENS.has(name));
}

function isEmptyClutter(el: Element): boolean {
  if (MEANINGFUL_EMPTY_TAGS.has(el.tagName.toLowerCase())) return false;
  if (el.textContent?.trim()) return false;
  return !el.querySelector(MEANINGFUL_EMPTY_SELECTOR);
}

export default function declutterHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  doc.body.querySelectorAll("*").forEach((el) => {
    if (isFlaggedAsClutter(el)) el.remove();
  });

  // Removing a chrome element can leave its (once meaningful) parent empty,
  // so prune emptied-out wrappers bottom-up until nothing more qualifies.
  let prunedAny = true;
  while (prunedAny) {
    prunedAny = false;
    doc.body.querySelectorAll("*").forEach((el) => {
      if (isEmptyClutter(el)) {
        el.remove();
        prunedAny = true;
      }
    });
  }

  return doc.body.innerHTML;
}
