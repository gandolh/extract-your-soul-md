# Sanitize /api/extract 500 bodies + typed failure classes

**Priority:** P2 · **Goal:** ease-of-use · **Impact:** medium · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
`/api/extract` returns raw `err.message` verbatim in a 500
([results.ts:51-60](../../src/server/routes/results.ts#L51-L60)) — so users
literally see `Ollama HTTP <status>: <body>` or, far more commonly, raw
`TypeError: fetch failed` when Ollama isn't running, plus filesystem paths from
the work-dir pipeline. Only `ExtractionBusyError` / `NothingToExtractError` are
mapped to friendly codes; everything else leaks. (Server-side
`request.log.error(err)` already runs — only the *returned* message needs fixing.)

## Decision / approach (audit-refined)
- In [ollama.ts](../../src/ollama.ts), wrap `fetch` in try/catch and throw a typed
  `OllamaUnavailableError` on network rejection (ECONNREFUSED is the #1 failure),
  `OllamaRequestError` on non-ok — keep raw text only for logs (`cause`).
- In [results.ts](../../src/server/routes/results.ts), map
  `OllamaUnavailableError` → **503** ("Local Ollama server is not reachable —
  start it and try again."); replace the final `const message = err.message` with
  a fixed generic "Extraction failed — please try again.".
- **Drop** the "jobs-table persisted error field" clause unless the job model
  lands first — coordinate with
  [async-extraction-job-model](async-extraction-job-model.md).

## First step
Wrap the `fetch` in `generate()` with try/catch → `OllamaUnavailableError(host)`
(original as `cause`).

## Dependencies & sequencing
Naturally co-implemented with
[ollama-preflight-timeout-retry](ollama-preflight-timeout-retry.md)
(same typed-error surface).

## Refs
code: [ollama.ts](../../src/ollama.ts), [results.ts](../../src/server/routes/results.ts), [client.ts](../../frontend/src/api/client.ts), [ResultsPage.tsx](../../frontend/src/pages/ResultsPage.tsx)
