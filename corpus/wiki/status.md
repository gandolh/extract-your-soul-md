# Status — where the project stands

_Snapshot as of 2026-06-17. Re-stamp this date on update. The living dashboard:
deliberately thin — detail lives in the brief files and [log.md](../log.md)._

## Where things stand

The project is **API + frontend only**: a React SPA + Fastify + SQLite where users
register, answer themed studies, import WhatsApp conversations, and generate a
per-user `soul.md`. There is **no CLI and no Claude `/extract-soul` skill** — both
were removed (brief 04, 2026-06-16). The shared data-prep + extraction pipeline
(`src/stages/`, `src/ollama.ts`) still exists but is reachable only from the
server, via `src/server/pipeline.ts`, against a per-user throwaway work dir built
from SQLite rows at extraction time.

The questionnaire path the research designed
([sources-raw/03-integration-plan.md](sources-raw/03-integration-plan.md)) has
**shipped** as the web studies forms — `src/questions.ts` (canonical Q1..Q12),
`src/studies.ts` (themed grouping), the Q&A parser in `process.ts`, and the
`MAP_PROMPT_HEADER_QA` prompt. Capture lives in the SPA (Studies index +
StudyPage); answers are materialized to `questionnaire/answers.md` at extract time
via the shared `src/answers-file.ts` writer.

## By area

- **Data-prep pipeline** (`src/stages/process.ts`, `chunk.ts`) — done and stable;
  invoked only from the server pipeline, not a CLI.
- **Questionnaire path** — shipped as the web studies forms (no REPL); shared
  `answers.md` format via `src/answers-file.ts`.
- **Extraction (Ollama)** — the single extraction path. Async **background job**
  model (brief 14): `POST /api/extract` → 202 + jobId, runs via `setImmediate`,
  DB-backed per-user lock (partial unique index), reclaimed on restart; the
  client polls `GET /api/results` for stage/chunk progress.
- **Web platform (auth, studies, import, results, eval)** — built and running.
- **Eval harness** (brief 05) — A/B/C conditions + 5 voice metrics, exposed at
  `/api/eval` and the EvalPage; framework ready, head-to-head measurement still
  blocked on real user data + live Ollama.
- **Tests** — `node --test` golden tests for the deterministic stages
  (answers-file, process, chunk, tokens); `npm test`. CI typechecks + builds
  (brief 35). No frontend test runner or linter (deliberate).

## Open threads

Genuinely-unresolved items live in [open-questions.md](open-questions.md). The
research-side open questions (style-card vs. raw examples, regurgitation risk) are
tracked in their concept pages and summarized in [overview.md](overview.md). Two
engineering todos remain deferred behind triggers: hierarchical tree-reduce (a
heavy user hitting the chunk ceiling) and multi-platform import adapters (a real
second-format request) — see [todos/](../todos/).
