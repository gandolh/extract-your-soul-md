# Status — where the project stands

_Snapshot as of 2026-06-15. Re-stamp this date on update. The living dashboard:
deliberately thin — detail lives in the brief files and [log.md](../log.md)._

## Where things stand

Both front doors are built and working: the **CLI pipeline** (process → chunk →
Claude `/extract-soul` or Ollama) and the **web platform** (React SPA + Fastify +
SQLite with registration, themed studies, conversation import, and per-user
`soul.md` generation). The questionnaire path that the research designed
([sources-raw/03-integration-plan.md](sources-raw/03-integration-plan.md)) has
**shipped** — `src/questions.ts`, `src/stages/interview.ts`, the Q&A parser in
`process.ts`, the `MAP_PROMPT_HEADER_QA` prompt, and the extended skill all exist.

Recent work (per git) has been on the **web UI / visual design** — see the design
brief and tokens in [sources-raw/](sources-raw/).

## By area

- **CLI data-prep pipeline** — done and stable. `npm run start`.
- **Questionnaire / interview path** — shipped (REPL + web form, shared
  `answers.md` format).
- **Extraction Path A (Claude `/extract-soul`)** — working, CLI-only.
- **Extraction Path B (Ollama)** — working; the only programmatic path for the web
  platform.
- **Web platform (auth, studies, import, results)** — built and running.
- **Web UI visual design** — in active iteration.
- **Tests / linting** — none configured (manual testing only).

## Open threads

Genuinely-unresolved items live in [open-questions.md](open-questions.md). The
research-side open questions (style-card vs. raw examples, regurgitation risk, a
second targeted narrative prompt) are tracked in their concept pages and
summarized in [overview.md](overview.md).
