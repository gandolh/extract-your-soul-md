# 18 — Sanitize extraction/eval error responses + typed Ollama failures

**Priority:** P2 · **Goal:** ease-of-use · **Impact:** medium · **Effort:** S · **Status:** done · **Promoted:** 2026-06-16 (from `todos/sanitize-extract-error-responses.md`) · **Done:** 2026-06-16

## Problem
The extraction failure path surfaced raw `err.message` to the user — `Ollama HTTP
<status>: <body>`, or far more commonly `TypeError: fetch failed` when Ollama
isn't running, plus filesystem paths from the work-dir pipeline. Only the friendly
domain errors were mapped.

## Re-scope note
The todo cited the OLD synchronous `results.ts` (500 body, `ExtractionBusyError`).
Brief 14 already made extraction async, so the leak now lands in the **job's
`error` field** (surfaced via the polling toast), not a live 500. Fixed there
instead. Also fixed the same leak in the still-synchronous `/api/eval` 500.

## Outcome (2026-06-16)
- `ollama.ts`: `generate()` wraps `fetch` in try/catch → typed
  `OllamaUnavailableError(host, {cause})` on network rejection (ECONNREFUSED is #1),
  `OllamaRequestError(status, {cause})` on non-ok. Raw text/body kept only in `cause`.
- `results.ts`: `failureMessage(err)` maps typed errors to safe strings
  (Unavailable → "The Ollama server is not reachable — start it and try again.";
  RequestError → "…rejected the request…"; everything else → "Extraction failed —
  please try again."). The job's `error` field gets only these; `request.log.error`
  still logs the raw cause.
- `eval.ts`: same mapping — `OllamaUnavailableError` → 503, `OllamaRequestError` →
  502, else generic 500 (was leaking `err.message`).

Verified at runtime: pointed `OLLAMA_HOST` at a dead port, ran extraction → job
failed with the sanitized "…not reachable…" message, while the server log retained
the full raw cause (`ECONNREFUSED 127.0.0.1:59999`, `fetch failed`, stack). Build +
typecheck clean. Nothing committed.

## Refs
code: [ollama.ts](../../../src/ollama.ts), [results.ts](../../../src/server/routes/results.ts), [eval.ts](../../../src/server/routes/eval.ts) · related: [14-async-extraction-job-model](14-async-extraction-job-model.md)
