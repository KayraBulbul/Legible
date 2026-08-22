# AI part — architecture plan

Personal planning doc for the Gemini/AI work, based on the team's split (J = extension,
Andrew = React dashboard, Kayra = FastAPI + Postgres backend, me = AI) and the contract
already drafted in [api.md](api.md). Not a finished spec — assumptions and open questions
are called out explicitly so they can get confirmed with the team instead of silently
baked in.

## Where this fits in the whole system

```
Extension (J)  ──┐
                  ├─► FastAPI backend (Kayra) ──► Postgres (Kayra)
Dashboard (Andrew)┘         │
                            ▼
                    MY CODE lives here:
                    Gemini calls behind two endpoints
```

Neither the extension nor the dashboard talks to Gemini directly (the extension does
*today*, but per `api.md` that's temporary and gets replaced). Every AI request goes:
client → Kayra's FastAPI route → my function → Gemini → back up the chain.

**I am not building**: FastAPI routes, auth, the database, or the extension/dashboard UI.
**I am building**: the function(s) that take already-extracted content, call Gemini, and
return a result matching the exact JSON shapes in `api.md`.

## The two jobs, and the pipeline for each

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

Prompt wording was translated straight from the existing JS file — no need to reinvent it.

## How my code plugs into Kayra's backend

The assumption I'm working from: I hand Kayra two Python functions (or a small module),
and Kayra's FastAPI route handlers do the HTTP/auth/DB parts and call into mine. That
means my code should never need to know about users, tokens, or the database — it just
takes already-validated content in, returns a result out.

**This interface is an assumption, not confirmed** — see below.

## Resolved since this was first written

- **Model name — RESOLVED by actually testing, 2026-08-22.** `gemini-2.0-flash` (old
  extension code) and `gemini-2.5-flash` are both dead (404, "no longer available").
  `docs/api.md`'s `gemini-3.7-flash` returned repeated `503 UNAVAILABLE` ("high demand")
  and never completed a call in testing — might be a flaky preview model, worth retrying
  later. **`gemini-3.6-flash` is what actually works end-to-end**, confirmed with real
  output from both functions, on two different machines. This is now the default in
  `gemini_service.py` and `.env.example`. Still worth telling Kayra the doc's `3.7` may
  need updating to `3.6`, or that `3.7` deserves a retry later.
- **Python SDK — RESOLVED.** Using `google-genai` (Google's current unified SDK), not the
  older `google-generativeai`.
- **Python 3.9 compatibility — RESOLVED.** My own `.venv` is Python 3.9, which doesn't
  support the `dict | None` shorthand syntax (that needs 3.10+). Fixed by using
  `Optional[dict]` from `typing` instead. Worth remembering for any code I write later too.

## Still not sure — need to confirm with the team

- **Who owns the two route handlers, literally?** I'm assuming Kayra writes the FastAPI
  route (`@app.post("/api/v1/transformations")`) and just calls my function inside it.
  It could also be that I'm expected to write the route myself. Worth a direct question.
- **Sync vs. async — NEW concern, not yet raised with Kayra.** My functions are
  synchronous/blocking (plain `google.genai.Client`, not its async version). If Kayra
  writes an `async def` FastAPI route and calls my function directly inside it, it will
  block FastAPI's whole event loop while waiting on Gemini — meaning the server can't
  handle any other request until mine finishes. Needs a decision: either Kayra calls my
  function through FastAPI's `run_in_threadpool`, or I switch to the async client
  (`client.aio.models.generate_content`). Flag this before it becomes a load-testing
  surprise.
- **Caching**: the image-description response includes a `"cached": false` field, meaning
  *something* checks a cache before calling Gemini — like the extension already does
  locally via a SHA-256 hash in `chrome.storage.local`. On the backend, is that check
  Kayra's job (e.g. a Postgres/Redis lookup before calling my function), or mine (I'd need
  a hashing step and access to some store)? I've assumed it's Kayra's job since it needs a
  persistent store, but that's unconfirmed.
- **Error handling contract**: `api.md` lists specific HTTP codes my failures need to map
  to (`413` too large, `415` bad type, `429` rate limit, `502` upstream failure). I'm
  assuming I should raise distinguishable Python exceptions for each case and let Kayra's
  route layer catch and translate them to those status codes, rather than me returning
  HTTP-shaped responses myself. Worth confirming that division of labor explicitly.
- **Output HTML safety — deliberately deferred, not forgotten.** `api.md` says the backend
  re-sanitizes stored HTML, but doesn't say whether that runs on my `transform_content`
  output too, or whether I need to worry about Gemini producing unsafe HTML. Decided to
  punt on this for now to keep moving during the hackathon — comes back before this ships
  anywhere real.

## What I'd actually do next, in order

1. ~~Confirm the real Gemini model name and which Python SDK to use~~ — done, see
   "Resolved" above.
2. ~~Write `transform_content` and `describe_image`, prove both work~~ — done. Both
   tested successfully against `docs/api.md`'s example inputs and against real content via
   `python -m backend.ai.manual_test --text ... --image ...`.
3. Bring the still-open questions above to Kayra — especially the sync/async one, since
   it affects how they wire the route, not just a detail I can quietly decide myself.
4. Once agreed, hand off the functions for Kayra to wire into the actual FastAPI routes.
5. Commit this work on the `ai-gemini-integration` branch once reviewed.
