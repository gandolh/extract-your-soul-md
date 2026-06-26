# Status — where the project stands

_Snapshot as of 2026-06-26. Re-stamp this date on update. The living dashboard:
deliberately thin — detail lives in the brief files and [log.md](../log.md)._

## Where things stand

The project is **API + frontend only**: a React SPA + Fastify + SQLite where users
register, answer themed **studies**, refine a generated **swipe-card deck**
("does this sound like you?"), and generate a per-user `soul.md`. There is **no
CLI and no Claude `/extract-soul` skill** — both were removed (brief 04,
2026-06-16). The shared data-prep + extraction pipeline (`src/stages/`,
`src/ollama.ts`) still exists but is reachable only from the server, via
`src/server/pipeline.ts`, against a per-user throwaway work dir built from SQLite
rows at extraction time.

**The conversation/WhatsApp import path was removed** (2026-06-22) and replaced by
the swipe-card refinement loop; the **Eval harness was removed** in the same pass.
The only LLM-driven extraction input is now the questionnaire (+ confirmed swipe
statements folded in as a reserved `## Q900` section).

## By area

- **Data-prep pipeline** (`src/stages/process.ts`, `chunk.ts`) — done and stable;
  invoked only from the server pipeline, not a CLI. `process.ts` is now
  **questionnaire-only** (the WhatsApp parser + "your messages only" voice filter
  were removed with the conversations feature).
- **Questionnaire path** — shipped as the web studies forms (no REPL); shared
  `answers.md` format via `src/answers-file.ts`. Studies now span a **voice band**
  (free-text) and a **profile band** (choice/trait studies with scored reports —
  brief 37).
- **Swipe cards** (`src/server/swipe.ts`, `routes/swipe.ts`, `SwipePage`) — the
  Stage 0.5 refinement loop. An LLM generates first-person statements from the
  user's own answers/profile/prior `soul.md`; the user swipes yes/no; confirmed
  statements ride into `answers.md` as `## Q900`. This is the **only** place
  capture touches an LLM.
- **Conversation statistics** (`src/stats/conversation-stats.ts`,
  `routes/stats.ts`, `StatsPage`/`SavedStatsPage`) — a **transient, no-LLM**
  feature (2026-06-26). A pasted chat export is parsed + reduced to aggregate
  numbers on the server and the transcript is discarded — **never stored**. Only
  the derived statistics can be saved (`saved_stats` table), named, and reviewed
  on a separate page. Independent of the `soul.md` pipeline.
- **Extraction (Ollama)** — the single extraction path. Async **background job**
  model (brief 14): `POST /api/extract` → 202 + jobId, runs via `setImmediate`,
  DB-backed per-user lock (partial unique index), reclaimed on restart; the
  client polls `GET /api/results` for stage/chunk progress.
- **Web platform (auth, studies, swipe, stats, results)** — built and running.
- **Tests** — `node --test` golden tests for the deterministic stages
  (answers-file, process, chunk, tokens, scoring, conversation-stats); `npm test`.
  CI typechecks + builds (brief 35). No frontend test runner or linter
  (deliberate).
- **UI audits** — Playwright/browser walkthroughs use the `playwright/` hub at the
  repo root; screenshots land in `playwright/screenshots/` (gitignored).

## Open threads

Genuinely-unresolved items live in [open-questions.md](open-questions.md). The
research-side open questions (style-card vs. raw examples, regurgitation risk) are
tracked in their concept pages and summarized in [overview.md](overview.md). Two
engineering todos remain deferred behind triggers: hierarchical tree-reduce (a
heavy user hitting the chunk ceiling) and multi-platform import adapters (a real
second-format request) — see [todos/](../todos/).
