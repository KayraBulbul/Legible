// Fixture content for mock-API mode (src/api/mock.ts). Real reader content
// comes from the backend; these strings only back the standalone dev fixtures
// in src/api/pages.ts and src/api/ai.ts.
export const SAMPLE_ARTICLE = `Accessible design is not an add-on. When colour contrast, font choice, and structure are considered from the start, a page becomes easier to read for everyone, not just people using assistive technology. Screen readers depend on meaningful labels, dyslexia-friendly type depends on spacing and letterforms, and high-contrast themes depend on colour being used with intent rather than habit.`;

/** Mock stand-ins for `POST /api/v1/transformations` output, one per operation (docs/api.md). */
export const SAMPLE_SIMPLIFIED = `Good accessible design helps everyone. Clear colours, readable fonts, and simple structure make a page easier to use — not just for screen readers, but for every visitor.`;

export const SAMPLE_SUMMARY = `TL;DR — Accessibility should be built in from the start: it improves the page for all readers, not only assistive-tech users.`;

export const SAMPLE_RESTRUCTURED = `<h2>Why accessibility comes first</h2><p>Accessible design is not an add-on.</p><h3>What it depends on</h3><ul><li>Screen readers need meaningful labels.</li><li>Dyslexia-friendly type needs spacing and letterforms.</li><li>High-contrast themes need colour used with intent.</li></ul>`;

export const SAMPLE_FOCUS = `The single most important idea: build accessibility in from the start, since it makes a page easier to read for everyone, not only people using assistive technology.`;
