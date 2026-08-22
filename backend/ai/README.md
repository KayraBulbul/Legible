# AI part (Gemini)

Gemini-backed logic for two endpoints described in [docs/api.md](../../docs/api.md):
`POST /api/v1/transformations` (simplify/summarize/restructure/focus) and
`POST /api/v1/image-descriptions` (image → alt text).

note that gemini can only proces 15 request per minute and up to 1500 req per day (cuz im using free tier)

## Files

- `gemini_service.py` — the two functions: `transform_content()` and `describe_image()`
- `prompts.py` — prompt text per operation / image kind
- `errors.py` — 4 exception types that map to the 413/415/429/502 HTTP codes the API
  contract requires
- `manual_test.py` — local test script, see below
- `requirements.txt`, `.env.example` — setup files

## Setup

From the repo root:

```bash
pip install -r backend/ai/requirements.txt
cp backend/ai/.env.example backend/ai/.env
```

Then open `backend/ai/.env` and paste in your own Gemini API key (get a free one at
[aistudio.google.com/apikey](https://aistudio.google.com/apikey)):

```
GEMINI_API_KEY=your-real-key-here
```

Currently confirmed working model: `gemini-3.6-flash` (already set as the
default).

A virtual environment is optional — see `python3 -m venv .venv` if you want one, but
`pip install` works fine directly too.

## Running the test script

From the repo root (must run as a module, with `-m`, not as a plain script — it needs
to import sibling files as a package):

```bash
python -m backend.ai.manual_test
```

this runs both functions against small built-in fake examples (a
one-line "Complex content." string, and a 1x1 fake pixel image) — good for a quick
sanity check that your key and setup work at all.

### Testing against a real HTML file

```bash
python -m backend.ai.manual_test --html backend/ai/test/test.html
```

Point `--html` at any file containing a real HTML fragment — like the body of an
actual article. To grab one: open a page, right-click → "View Page Source" (or
`Cmd+Option+U` in Chrome), find the actual article content (usually inside an
`<article>` tag or a big `<div>`), copy just that chunk, and save it as a `.html`
file anywhere — `backend/ai/test/` is a convenient spot to keep test fixtures.

There's also `--text path/to/file.txt` for plain text (gets auto-wrapped in a bare
`<article>` tag) — `--html` is the more realistic test since production input is
actually HTML, not plain text. If you pass both, `--html` wins.

### Testing against a real image

```bash
python -m backend.ai.manual_test --image backend/ai/test/image.png
```

Point `--image` at any real `.png`/`.jpg`/`.jpeg`/`.webp`/`.svg` file — a screenshot,
a downloaded photo, whatever. It gets base64-encoded and sent to Gemini's vision
model automatically.

### Combining both

```bash
python -m backend.ai.manual_test --html backend/ai/test/test.html --image backend/ai/test/image.png
```

### What you'll see

- A list of every Gemini model containing "flash" that your key can access (useful if
  the pinned model ever stops working again — rerun this to see what's actually
  available and update `GEMINI_MODEL` in `.env`)
- `transform_content()`'s full output: the rewritten HTML/text plus metadata
- `describe_image()`'s full output: the generated alt text, role, and metadata

If something errors out, paste the actual error message when asking for help — it
never contains your API key.

---

# AI part — architecture

### Job 1 — Text transformations (`POST /api/v1/transformations`)

Operations: `simplify`, `summarize`, `restructure`, `focus`.

```
input: { format, html, text, language }  +  { operation, options }
                    │
                    ▼
        pick prompt template for the operation
                    │
                    ▼
        call Gemini with the text/html + prompt
                    │
                    ▼
        parse Gemini's reply back into { format, html, text, language }
                    │
                    ▼
output: { output: {...}, metadata: { operation, provider, model, promptVersion, performedAt } }
```

**Implemented and tested working**, in `backend/ai/gemini_service.py`:

```python
def transform_content(operation: str, input_document: dict, options: Optional[dict] = None) -> dict:
    # returns {"output": {...}, "metadata": {...}}
```

One function, branching internally on `operation` to pick the right prompt template —
four prompt templates total (simplify-v1, summarize-v1, restructure-v1, focus-v1, in
`backend/ai/prompts.py`), matching the `promptVersion` field the contract expects.
Note this still lives standalone under `backend/ai/`, not inside any FastAPI app
structure — see the "how this plugs in" section below, still unconfirmed with Kayra.

### Job 2 — Image descriptions (`POST /api/v1/image-descriptions`)

This is a straight port of what already works client-side in
[extension/background/gemini-client.js](../extension/background/gemini-client.js) — same
idea, moved to Python:

```
input: { kind, dataUrl, contextText? }
                    │
                    ▼
        decode base64 image, pick prompt by kind (img / icon-button / canvas)
                    │
                    ▼
        call Gemini vision with image + prompt
                    │
                    ▼
        parse JSON reply: { altText, role }
                    │
                    ▼
output: { altText, role, cached, metadata: {...} }
```

**Implemented and tested working**, in `backend/ai/gemini_service.py`:

```python
def describe_image(kind: str, data_url: str, context_text: Optional[str] = None) -> dict:
    # returns {"altText": ..., "role": ..., "cached": False, "metadata": {...}}
    # "cached" is hardcoded False — this function does no caching itself, see open question below
```
