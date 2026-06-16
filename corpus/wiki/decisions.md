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
- **Defaults target Ollama Cloud** (`https://ollama.com`, `gpt-oss:120b-cloud`)
  since 2026-06-16 ([briefs/done/08](../briefs/done/08-ollama-cloud-backend.md)).
  `OLLAMA_API_KEY` is sent as a `Bearer` header when set; blank key + a localhost
  `OLLAMA_HOST` falls back to a local server. Same `/api/generate` contract either
  way — the only change is the auth header and the model tag.
- **`node:sqlite` (Node ≥ 24), not `better-sqlite3`** — for now. Migration later
  is mechanical (same API surface).
- **The frontend keeps its own Vite root + tsconfig**, separate from the
  backend's NodeNext tsconfig (DOM lib + react-jsx + Bundler resolution).
- **WhatsApp-only parser; token estimator tuned for Romanian/English** (the
  estimator counts UTF-8 bytes / 4 since brief 33 — diacritics/emoji cost their
  real BPE budget; no tokenizer dep, `gpt-tokenizer` rejected as Llama-mismatched).
- **`node:test` for the no-LLM data-prep core; no frontend test runner.** Decided
  2026-06-16 ([log.md](../log.md), [briefs/done/34](../briefs/done/34-node-test-golden-tests.md)),
  flipping the prior "no test runner — manual testing only". Uses the built-in
  `node:test` + `tsx` loader (zero new dependency on Node 24): `npm test` runs
  `src/**/*.test.ts`; `npm run typecheck:test` type-checks them via
  `tsconfig.test.json` (the prod `build:server` excludes `*.test.ts`, so no test
  code ships to `dist/`). Scope is the **deterministic, no-LLM** core — the
  `answers.md` format contract, `estimateTokens`, and `processAll`/`chunkAll` fs
  behavior. **No linter** and **no Vitest for the frontend** (deliberately
  skipped — adds a dep for little value; revisit only if the SPA grows complex
  logic). Ollama-touching code stays manual (LLM I/O isn't unit-testable here).
- **CI runs on GitHub Actions** ([.github/workflows/ci.yml](../../.github/workflows/ci.yml),
  brief 35, 2026-06-16) on push-to-main + every PR: Node 24, `npm ci`, then
  `npm run build` (server tsc + web Vite build), `typecheck:web`,
  `typecheck:test`, and `npm test`. No Ollama in CI — only the deterministic,
  no-LLM gates run. Was previously "no CI".

## Corpus

- **The corpus lives at the repo root (`./corpus`)**, with the migrated research
  wiki under `corpus/wiki/`. Standard relative markdown links, never Obsidian
  `[[wikilinks]]`. See [CLAUDE.md](../CLAUDE.md).
