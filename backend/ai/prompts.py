"""Prompt templates, versioned per docs/api.md's `promptVersion` field.

Each value is (promptVersion, promptText). Bump the version string whenever the
wording changes meaningfully, so stored transformations keep a record of which
prompt produced them.
"""

TRANSFORM_PROMPTS = {
    "simplify": (
        "simplify-v1",
        "Rewrite the following content in simpler language, keeping every fact and the "
        "same overall meaning. Keep the same HTML structure (headings, paragraphs, lists) "
        "where possible.",
    ),
    "summarize": (
        "summarize-v1",
        "Summarize the following content concisely, keeping the most important facts. "
        "Return a short semantic HTML fragment (a few paragraphs at most).",
    ),
    "restructure": (
        "restructure-v1",
        "Rewrite the following content with clearer structure: add headings, break up "
        "long paragraphs, and use lists where it helps readability. Do not change the "
        "meaning.",
    ),
    "focus": (
        "focus-v1",
        "Extract and return only the single most important idea or section from the "
        "following content, dropping everything secondary.",
    ),
}

# Reused from the extension's existing extension/background/gemini-client.js wording —
# same job, moved server-side.
IMAGE_PROMPTS = {
    "img": (
        "image-description-v1",
        "This image appears on a webpage without usable alt text. Write a concise, "
        "highly descriptive accessibility alt-text (1-2 sentences) a screen reader can "
        "read aloud. Also classify it as one of: photo, illustration, chart, icon, logo, "
        "decorative.",
    ),
    "icon-button": (
        "image-description-v1",
        "This is an icon used inside an interactive button or link with no accessible "
        'label. Describe in 2-6 words what action this control performs, suitable for an '
        'aria-label (e.g. "Close dialog", "Search").',
    ),
    "canvas": (
        "image-description-v1",
        "This is a snapshot of an interactive <canvas> element (chart, diagram, or "
        "graphic app) with no accessible description. Write a concise 1-2 sentence "
        "description of what it shows.",
    ),
}
