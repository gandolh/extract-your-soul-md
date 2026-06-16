# Corpus index

The front door to the `extract-your-soul-md` corpus — the project's
LLM-maintained wiki + work tracker. Read [CLAUDE.md](CLAUDE.md) for how this
corpus is maintained; [log.md](log.md) for its history.

## Work lifecycle

- [todos/](todos/) — captured ideas/tasks as prose, pre-spec. **soul.md
  improvement backlog captured 2026-06-16** (33 todos: P1×8 / P2×16 / P3×9; 3 of
  the P1s are marked done-in-place — cache fingerprint, truncation, determinism —
  shipped as briefs 01–03, plus the new brief 04 API-only collapse).
  `single-source-reduce-template` (P2) was deleted as obsolete after the CLI
  removal. The P1 foundation arc (briefs 01–05) is complete — incl. the eval
  harness. Open P1s: autosave, import-sender-detection, name-normalization,
  reframe-prompts.
- [briefs/todo/](briefs/todo/) — numbered work specs ready to build.
- [briefs/done/](briefs/done/) — completed specs (immutable, with outcome notes).
  01 cache-fingerprint · 02 truncation · 03 determinism · 04 collapse-to-API ·
  05 eval-harness.
- [briefs/superseded/](briefs/superseded/) — specs later undone/replaced.
- [log.md](log.md) — chronological record of every meaningful corpus change.

## Wiki — project state (the corpus-flow spine)

- [wiki/status.md](wiki/status.md) — dated snapshot of where the project stands.
- [wiki/architecture.md](wiki/architecture.md) — structural map of the codebase
  (CLI core + web platform over a shared pipeline).
- [wiki/decisions.md](wiki/decisions.md) — locked tech/design choices.
- [wiki/open-questions.md](wiki/open-questions.md) — genuinely unresolved threads.

## Wiki — research & design (the migrated LLM Wiki)

The research behind the questionnaire path and voice imitation. Start here:

- [wiki/overview.md](wiki/overview.md) — the thesis: build input for *voice
  imitation*, not a personality report.
- [wiki/index.md](wiki/index.md) — the full research-wiki catalog (frameworks,
  concepts, source summaries).
- [wiki/sources-raw/](wiki/sources-raw/) — the immutable raw design docs:
  research synthesis, questionnaire design, integration plan, references, plus
  the web-UI design brief and design tokens.

## Where else knowledge lives

- The root [CLAUDE.md](../CLAUDE.md) owns pipeline mechanics and run commands.
- The code under [src/](../src/) and [frontend/](../frontend/) is the ultimate
  source of truth (it wins over any wiki claim — verify before quoting).
