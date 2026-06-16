# 20 — Ollama preflight health + client timeout/abort/retry + readiness gate

**Priority:** P2 · **Goal:** ease-of-use · **Impact:** medium · **Effort:** M · **Status:** done · **Promoted:** 2026-06-16 (from `todos/ollama-preflight-timeout-retry.md`) · **Done:** 2026-06-16

## Problem
The web path is Ollama-only with no preflight: it ran process → chunk first, then
discovered a down Ollama only on the first `generate()`. `generate()` was a bare
`fetch` — no timeout, no abort, no retry — so a hung server blocked up to the
15-min ceiling and a transient blip failed the whole run. The user had no signal
that Ollama must be running.

## Outcome (2026-06-16) — three slices, all shipped
1. **timeout + retry** (`ollama.ts`): `generate()` wraps `fetch` with
   `AbortSignal.timeout(opts.timeoutMs)` and retries up to 3× with exponential
   backoff (500ms, 1000ms) on transient failure — network/timeout
   (`OllamaUnavailableError`) or 5xx (`OllamaRequestError` status≥500) — but NOT
   on 4xx (won't self-heal). The map cache means a retried run skips finished
   chunks. New `OLLAMA_TIMEOUT_MS` (default 600000) in config + `.env.example`;
   threaded into all `generate()` calls (extract ×2, eval ×1).
2. **preflight** (`pingOllama` in `ollama.ts`): hits `${host}/api/tags`, returns a
   structured `PingResult` (never throws — a hung server can't block). Called at
   the TOP of `runUserExtraction` before any mkdir/process work; on not-ready it
   throws `OllamaUnavailableError` carrying the reason as a string `cause`, which
   `results.ts` `failureMessage` surfaces (string cause = curated/safe; Error
   cause = raw, kept generic).
3. **readiness gate** (`results.ts` + frontend): `GET /api/results` returns
   `ollamaReady`/`ollamaReason`, TTL-cached 30s + single-flight so a slow ping
   can't slow page loads. ResultsPage gates the Generate button on `ollamaReady`
   and shows a Notice with the reason.

## Bug caught by verification (would have broken ALL cloud extraction)
First `pingOllama` enforced model-membership against `/api/tags`. But ollama.com
lists 35 models under bare names (`gpt-oss:120b`) — NOT the `-cloud`-suffixed id
we address (`gpt-oss:120b-cloud`) — and cloud models are never "pulled". So the
live cloud ping false-reported "model not pulled" and would have blocked every
cloud run. **Fix:** when an API key is set (= cloud), skip the membership check —
reachability is enough; a wrong model surfaces as a clean error at generate. The
local (no-key) path still asserts membership (`/api/tags` is authoritative there).

## Verification
Unit (live + mock servers): dead host → not-reachable; **live cloud → ready**
(post-fix); generate-against-dead → `OllamaUnavailableError` after ~1.5s (retry
backoff observed); local-mock missing model → "not pulled", present → ready.
Integration: live cloud `GET /api/results` → `ollamaReady:true`; dead host →
`ollamaReady:false` + reason, and `POST /api/extract` failed the preflight in
**39ms** with `stage:null`, `work_dir:null` (i.e. before any process/chunk work),
sanitized error in the job. Build + both typechecks clean. Scratch tests + test
user removed, DB left as found. Nothing committed.

## Refs
code: [ollama.ts](../../../src/ollama.ts), [pipeline.ts](../../../src/server/pipeline.ts), [results.ts](../../../src/server/routes/results.ts), [config.ts](../../../src/config.ts), [ResultsPage.tsx](../../../frontend/src/pages/ResultsPage.tsx) · related: [18-sanitize-extract-error-responses](18-sanitize-extract-error-responses.md)
