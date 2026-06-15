# Make /api/extract an async persisted job (progress, restart-safe lock, reclamation)

**Priority:** P2 · **Goal:** ease-of-use · **Impact:** medium · **Effort:** M · **Status:** todo · **Captured:** 2026-06-16

## Problem
`POST /api/extract` awaits the multi-minute Ollama run inline
([results.ts:38-40](../../src/server/routes/results.ts#L38-L40)), hostage to the
15-min `requestTimeout`. The concurrency lock is an in-memory `Set<number>`
([pipeline.ts:24](../../src/server/pipeline.ts#L24)) that vanishes on restart,
orphaning the `mkdtemp` work dir and letting a user double-launch after a crash.
[ResultsPage.tsx](../../frontend/src/pages/ResultsPage.tsx) tracks its own local
`running` and never reads the server `running` flag (already returned at
[results.ts:24](../../src/server/routes/results.ts#L24)), so a mid-run reload
re-enables the button → confusing red 409 toast. The run shows only a spinner.

## Decision / approach (grilled 2026-06-16 — full job model now)
- Add a `jobs` table to [schema.sql](../../src/db/schema.sql)
  (id, user_id, status enqueued|running|done|failed, stage, chunk_done,
  chunk_total, work_dir, error, started_at, finished_at) + accessors in
  [repos.ts](../../src/db/repos.ts).
- **Replace the in-memory Set with a `getActiveJob(userId)` query** (the
  load-bearing correctness win — lock survives restart). `POST /api/extract`
  inserts enqueued, returns 202 + jobId, kicks the existing `runUserExtraction`
  body via `setImmediate`. Thread an `onProgress(stage, idx, total)` callback into
  [extract.ts](../../src/stages/extract.ts) (the map loop already prints
  `i+1/total`, so chunk-of-N is free).
- Surface status/stage/chunk on `GET /api/results`; **folds in the interim fix**
  (drive the button-disable + a poll loop from server state — this is what the
  standalone "restore in-flight state on mount" idea would have done).
- On `initDb`, mark still-`running` jobs as failed("interrupted by restart") and
  `rmSync` their work_dir (fixes orphaned dirs).
- Render a real progress bar (reuse the design system's progress-meter styling).
- Scope: single-process `setImmediate`, not an external queue — matches the
  local-Ollama single-box reality.

## First step
Add the `jobs` table to [schema.sql](../../src/db/schema.sql) (applied
idempotently on boot) + the create/getActive/updateProgress/finish/markStale
accessors in [repos.ts](../../src/db/repos.ts).

## Refs
code: [schema.sql](../../src/db/schema.sql), [repos.ts](../../src/db/repos.ts), [pipeline.ts](../../src/server/pipeline.ts), [results.ts](../../src/server/routes/results.ts), [extract.ts](../../src/stages/extract.ts), [ResultsPage.tsx](../../frontend/src/pages/ResultsPage.tsx) · corpus: [open-questions.md](../wiki/open-questions.md)
