# 14 — Make /api/extract an async persisted job (progress, restart-safe lock, reclamation)

**Priority:** P2 · **Goal:** ease-of-use · **Impact:** medium · **Effort:** M · **Status:** done · **Promoted:** 2026-06-16 (from `todos/async-extraction-job-model.md`) · **Done:** 2026-06-16

## Outcome (2026-06-16)
Full job model shipped, end-to-end verified against the live ollama.com cloud backend.

- **schema.sql** — new `jobs` table (id, user_id, status, stage, chunk_done,
  chunk_total, work_dir, error, started_at, finished_at). The per-user lock is a
  **partial unique index** `idx_jobs_active ON jobs(user_id) WHERE status IN
  ('enqueued','running')` — DB-enforced, race-free, restart-surviving (the old
  in-memory `Set` is gone).
- **repos.ts** — `JobRow`/`JobStatus` + `getActiveJob`, `getJob`, `createJob`,
  `startJob`, `updateJobProgress`, `finishJob`, `reclaimStaleJobs`.
- **extract.ts** — `runOllamaPipeline` takes an optional `onProgress(stage, done,
  total)` (`ProgressFn`); reports `map i/total` per chunk + `reduce` once.
- **pipeline.ts** — `runUserExtraction(cfg, userId, jobId)`: `startJob` records
  the work dir immediately (reclaimable crash trail), threads progress →
  `updateJobProgress`, `finally` always removes the work dir. Dropped the dead
  `ExtractionBusyError` + `isExtracting`.
- **results.ts** — `POST /api/extract` creates the job (lock via unique index;
  insert failure → 409), returns **202 + jobId** and runs the pipeline via
  `setImmediate` (the `.then/.catch` marks the job done/failed). `GET /api/results`
  surfaces `running` + a `job` block (status/stage/chunkDone/chunkTotal). New
  `GET /api/extract/:jobId` for polling (carries the error reason on failure).
- **app.ts** — on boot, `reclaimStaleJobs()` flips crashed enqueued/running jobs
  to failed and `rmSync`s their orphaned work dirs.
- **frontend** — client `extract()` now returns `{ok, jobId}` + `job(jobId)`;
  `ResultsState` gains a `job` field. ResultsPage drives `running` from server
  state (mid-run reload resumes the poll instead of re-enabling the button),
  polls `/api/results` every 2s, renders a real progress bar (map % ramps to 90,
  reduce pins 95) with a stage label, and reports the terminal outcome once.

Verified: `npm run build` + `npm run typecheck:web` clean. Runtime — unauth POST
→401; no-data →400; with data **POST returned 202+jobId in 11ms** (was minutes);
concurrent POST →409; `/api/results` showed live `map 0/1` → `reduce` → job
cleared, `soul.md` persisted (2355 chars), lock released. Boot reclamation:
seeded a stale `running` job + orphan dir → restart flipped it to
failed("Interrupted by a server restart.") and removed the dir. Test user +
artifacts cleaned; DB left as found.

**Caught pre-ship (same class as brief 05):** used a non-existent
`bg-surface-sunken` Tailwind class → corrected to the real `bg-surface-highest`
token (would have rendered a transparent progress track). Verify-before-class.

This is the biggest web-platform UX correctness win since the P1 arc and clears
the "/api/extract is synchronous" honest-limitation. Nothing committed.

## Problem
`POST /api/extract` awaits the multi-minute Ollama run inline
([results.ts:39-41](../../../src/server/routes/results.ts#L39-L41)), hostage to the
15-min `requestTimeout`. The concurrency lock is an in-memory `Set<number>`
([pipeline.ts:24](../../../src/server/pipeline.ts#L24)) that vanishes on restart,
orphaning the `mkdtemp` work dir and letting a user double-launch after a crash.
[ResultsPage.tsx](../../../frontend/src/pages/ResultsPage.tsx) tracks its own local
`running` and never reads the server `running` flag, so a mid-run reload re-enables
the button → confusing red 409 toast. The run shows only a spinner.

## Decision / approach (grilled 2026-06-16 — full job model now)
- Add a `jobs` table to [schema.sql](../../../src/db/schema.sql)
  (id, user_id, status enqueued|running|done|failed, stage, chunk_done,
  chunk_total, work_dir, error, started_at, finished_at) + accessors in
  [repos.ts](../../../src/db/repos.ts).
- **Replace the in-memory Set with a `getActiveJob(userId)` query** (the
  load-bearing correctness win — lock survives restart). `POST /api/extract`
  inserts enqueued, returns 202 + jobId, kicks `runUserExtraction` via
  `setImmediate`. Thread an `onProgress(stage, idx, total)` callback into
  [extract.ts](../../../src/stages/extract.ts) (the map loop already prints `i+1/total`).
- Surface status/stage/chunk on `GET /api/results`; folds in the interim fix
  (drive the button-disable + a poll loop from server state).
- On `initDb`, mark still-`running`/`enqueued` jobs as failed("interrupted by
  restart") and `rmSync` their work_dir (fixes orphaned dirs).
- Render a real progress bar.
- Scope: single-process `setImmediate`, not an external queue — matches the
  local-Ollama single-box reality.

## First step
Add the `jobs` table to [schema.sql](../../../src/db/schema.sql) + the
create/getActive/updateProgress/finish/markStale accessors in
[repos.ts](../../../src/db/repos.ts).

## Refs
code: [schema.sql](../../../src/db/schema.sql), [repos.ts](../../../src/db/repos.ts), [pipeline.ts](../../../src/server/pipeline.ts), [results.ts](../../../src/server/routes/results.ts), [extract.ts](../../../src/stages/extract.ts), [ResultsPage.tsx](../../../frontend/src/pages/ResultsPage.tsx) · corpus: [open-questions.md](../../wiki/open-questions.md)
