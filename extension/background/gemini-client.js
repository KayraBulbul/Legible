/* Multimodal prompt builder & caller for Gemini Vision (image -> alt text / ARIA role) */

const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const PROMPT_BY_KIND = {
  img: 'This image appears on a webpage without usable alt text. Write a concise, highly descriptive accessibility alt-text (1-2 sentences) a screen reader can read aloud. Also classify it as one of: photo, illustration, chart, icon, logo, decorative.',
  'icon-button': 'This is an icon used inside an interactive button or link with no accessible label. Describe in 2-6 words what action this control performs, suitable for an aria-label (e.g. "Close dialog", "Search").',
  canvas: 'This is a snapshot of an interactive <canvas> element (chart, diagram, or graphic app) with no accessible description. Write a concise 1-2 sentence description of what it shows.',
};

function splitDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

export async function analyzeImage({ dataUrl, kind }, apiKey) {
  const parts = splitDataUrl(dataUrl);
  if (!parts) throw new Error('Invalid image data');

  const promptText = PROMPT_BY_KIND[kind] || PROMPT_BY_KIND.img;
  const body = {
    contents: [
      {
        parts: [
          { text: `${promptText}\nRespond ONLY with compact JSON: {"altText": string, "role": string}.` },
          { inline_data: { mime_type: parts.mimeType, data: parts.base64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  };

  const resp = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Gemini API error ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const json = await resp.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    parsed = { altText: text.trim().slice(0, 200), role: 'img' };
  }

  return {
    altText: parsed.altText || 'AI description unavailable',
    role: normalizeRole(parsed.role, kind),
  };
}

function normalizeRole(role, kind) {
  if (kind === 'icon-button') return undefined;
  const allowed = new Set(['img', 'figure', 'graphics-document']);
  if (role && allowed.has(role)) return role;
  return undefined;
}
