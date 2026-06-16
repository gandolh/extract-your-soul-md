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
- **Capture is dumb; interpretation is smart.** No LLM calls at study-capture
  time; all interpretation happens at extract time.
- **`answers.md` has one format across all producers.** The web studies forms
  (via `answers-file.ts`'s `writeAnswersFile`) and the `process.ts` parser share
  the `## Qn — Title` section format and the `[skipped]` marker, owned by
  `answers-file.ts`. Don't break the contract.

## Engineering

- **`out/my-soul.md` is the stable output contract.** Other tools depend only on
  it; back up to `.prev.md` before overwriting.
- **The project is API + frontend only — no CLI.** Decided 2026-06-16
  ([log.md](../log.md), [briefs/done/04](../briefs/done/04-collapse-to-api-frontend-only.md)).
  The CLI pipeline (`npm run start`, `--interview`, `--ollama`) and the Claude
  `/extract-soul` skill path were removed; the web platform already covered every
  capability. `src/index.ts` is now a thin server entry. Was previously "two front
  doors over a shared core".
- **SQLite is the source of truth.** The shared pipeline code (`process → chunk →
  extract`) is reused by `server/pipeline.ts`; DB rows are materialized to a
  throwaway work dir on demand at extraction.
- **Extraction is Ollama-only**, run synchronously per-user via `/api/extract`.
  The higher-quality Claude path was deliberately dropped with the CLI (single
  surface > the quality path that needed repo-root `chunks/`).
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
