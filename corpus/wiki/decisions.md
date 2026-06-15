# Decisions — locked tech/design choices

Settled calls, recorded so future briefs and reviews **don't relitigate them**.
Changing one requires an explicit revisit + a [log.md](../log.md) note — don't
quietly flip a decision. This page wins over [status.md](status.md) for choices
not formally revisited.

## Research / product design

- **Build input for *voice imitation*, not a personality report.** Everything is
  weighed against imitating one specific person's writing voice. See
  [overview.md](overview.md).
- **Borrow prompts, not typologies.** No personality framework is scored. A
  framework earns its place only if it pulls a dimension chat logs can't see *and*
  its answer doubles as a voice sample. See the per-framework verdicts in
  [index.md](index.md).
- **All questions are open-ended free-text; no Likert scales.** Self-report
  questionnaires correlate ~5% with writing style; open-ended answers are
  dual-use (trait signal + voice sample). See
  [concepts/dual-use-signal.md](concepts/dual-use-signal.md).
- **The questionnaire is another input source, not a separate pipeline.** It flows
  through the same `process → chunk → extract` machinery.
- **The interview is dumb; interpretation is smart.** No LLM calls at REPL/capture
  time; all interpretation happens at extract time.
- **`answers.md` has one format across all producers.** The REPL, the web form,
  and the `process.ts` parser share the `## Qn — Title` section format and the
  `[skipped]` marker, owned by `answers-file.ts`. Don't break the contract.

## Engineering

- **`out/my-soul.md` is the stable output contract.** Other tools depend only on
  it; back up to `.prev.md` before overwriting.
- **SQLite is the web platform's source of truth.** The CLI pipeline code is
  reused unchanged; DB rows are materialized to files on demand at extraction.
- **The programmatic (web) extractor is Ollama-only.** The Claude `/extract-soul`
  path needs a Claude Code session and stays CLI-only.
- **`node:sqlite` (Node ≥ 24), not `better-sqlite3`** — for now. Migration later
  is mechanical (same API surface).
- **The frontend keeps its own Vite root + tsconfig**, separate from the
  backend's NodeNext tsconfig (DOM lib + react-jsx + Bundler resolution).
- **WhatsApp-only parser; token estimator tuned for Romanian/English.**
- **No test runner or linter is configured** — manual testing only, for now.

## Corpus

- **The corpus lives at the repo root (`./corpus`)**, with the migrated research
  wiki under `corpus/wiki/`. Standard relative markdown links, never Obsidian
  `[[wikilinks]]`. See [CLAUDE.md](../CLAUDE.md).
