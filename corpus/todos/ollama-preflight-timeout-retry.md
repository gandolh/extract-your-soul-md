# Ollama preflight health + client timeout/abort/retry + readiness state

**Priority:** P2 · **Goal:** ease-of-use · **Impact:** medium · **Effort:** M · **Status:** todo · **Captured:** 2026-06-16

## Problem
The web path is Ollama-only but there's no preflight:
[pipeline.ts](../../src/server/pipeline.ts) runs process → chunk first, then
discovers a down Ollama only on the first `generate()`.
[ollama.ts](../../src/ollama.ts) is a bare `fetch` with no timeout, no
`AbortController`, no retry — a hung Ollama blocks up to the 15-min ceiling and a
transient blip fails the whole run. The down server surfaces as a raw `Ollama
HTTP …` / `fetch failed` returned verbatim in the 500 and toasted raw. The user
has no idea Ollama must be running.

## Decision / approach (audit-refined — three shippable slices)
1. **timeout + abort + retry** in `generate()`: wrap `fetch` with
   `AbortController` + `AbortSignal.timeout(cfg.ollamaTimeoutMs)` and 2-3x
   retry-with-backoff on network/5xx (the cache means a whole-run rerun skips
   finished chunks). Add `OLLAMA_TIMEOUT_MS` to config. *(load-bearing core)*
2. **pingOllama(opts)** hitting `${host}/api/tags`, asserting `cfg.ollamaModel`
   is listed; throw a typed `OllamaUnavailableError`; call at the TOP of
   `runUserExtraction` (before any mkdir/process work); map to **503** with a
   friendly message ("Ollama is not running, or model X is not pulled — run
   `ollama pull X`").
3. **ollamaReady** on `GET /api/results` (best-effort + TTL-cached so a hung
   Ollama doesn't block page load) → gate the Generate button + show a Notice.

## First step
Wrap the `fetch` in `generate()` with `AbortController` + timeout + retry; add
`OLLAMA_TIMEOUT_MS` to [config.ts](../../src/config.ts).

## Dependencies & sequencing
Complements [sanitize-extract-error-responses](sanitize-extract-error-responses.md)
(typed errors → friendly messages) and the job model. Slice 1 is independent S
effort; do it first.

## Refs
code: [ollama.ts](../../src/ollama.ts), [pipeline.ts](../../src/server/pipeline.ts), [results.ts](../../src/server/routes/results.ts), [config.ts](../../src/config.ts) · corpus: [decisions.md](../wiki/decisions.md)
