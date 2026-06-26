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
- **Voice questions are open-ended free-text; trait questions may be choice-based.**
  Originally "no Likert scales anywhere" — self-report questionnaires correlate
  ~5% with writing style, and open-ended answers are dual-use (trait signal +
  voice sample; see [concepts/dual-use-signal.md](concepts/dual-use-signal.md)).
  **Revised 2026-06-17** (brief 37): a **profile band** of choice/trait studies
  (TIPI, HEXACO, tone, PCM, MBTI…) was added with scored reports. The voice band
  stays free-text-only.
- **Co-equal premise: every scored report is included in `soul.md` by default,
  including MBTI.** Decided in commit `130f305` ("improved accuracy on the soul"),
  superseding brief 37's "MBTI defaults off / self-report subordinate". Self-report
  now *collaborates with* observed voice rather than being ranked the weakest
  evidence — so `DEFAULT_INCLUDE` is all-on (`src/scoring.ts`) and the reduce
  prompt treats the reports as "real directions, corroborated by (not subordinate
  to)" the voice (`src/prompts.ts`). MBTI still carries the strongest self-report
  caveat into the UI + prompt (psychometrically weak, types flip on retake), and
  every report stays individually toggleable. **Tension to revisit if eval data
  ever lands:** this runs against the locked |ρ|≈.08 "self-report weakly predicts
  voice" research ([concepts/self-report-vs-observer-gap.md](concepts/self-report-vs-observer-gap.md))
  — it was an accuracy-motivated product call made without head-to-head measurement
  (the eval harness having been removed).
- **Swipe cards are the refinement loop, replacing conversation import.** Decided
  2026-06-22. The WhatsApp/conversation import pillar and the Eval harness were
  removed; an LLM-generated "does this sound like you?" deck (`swipe_cards`) lets
  the user confirm/reject first-person statements, which fold into `answers.md` as
  `## Q900`. This is the **only** capture-time LLM call (gated on `ollamaReady`,
  run synchronously with a higher temperature + random seed for variety).
- **Conversation statistics are transient + LLM-free + never stored.** Decided
  2026-06-26. A pasted chat export is analyzed on the server
  (`src/stats/conversation-stats.ts`) and the transcript is discarded — only the
  derived `ConversationStats` JSON can be saved (`saved_stats`, named
  `<index>-<YYYY-MM-DD>` by default). This feature is independent of the `soul.md`
  pipeline: no Ollama, no persistence of raw conversation text. (Idea adapted from
  the Yappinator project.)
- **The questionnaire is another input source, not a separate pipeline.** It flows
  through the same `process → chunk → extract` machinery.
- **Capture is dumb; interpretation is smart.** No LLM calls at study-capture
  time; all interpretation happens at extract time.
- **`answers.md` has one format across all producers.** The web studies forms
  (via `answers-file.ts`'s `writeAnswersFile`) and the `process.ts` parser share
  the `## Qn — Title` section format and the `[skipped]` marker, owned by
  `answers-file.ts`. Don't break the contract.

## Engineering

- **`soul.md` (the `results` table, via `/api/results`) is the stable output
  contract.** Other tools depend only on it; the prior version is carried into
  `prev_md` on overwrite. (The old `out/my-soul.md` file belonged to the removed
  CLI.)
- **The project is API + frontend only — no CLI.** Decided 2026-06-16
  ([log.md](../log.md), [briefs/done/04](../briefs/done/04-collapse-to-api-frontend-only.md)).
  The CLI pipeline (`npm run start`, `--interview`, `--ollama`) and the Claude
  `/extract-soul` skill path were removed; the web platform already covered every
  capability. `src/index.ts` is now a thin server entry. Was previously "two front
  doors over a shared core".
- **SQLite is the source of truth.** The shared pipeline code (`process → chunk →
  extract`) is reused by `server/pipeline.ts`; DB rows are materialized to a
  throwaway work dir on demand at extraction.
- **Extraction is Ollama-only**, run as an **async persisted job** per-user via
  `/api/extract` (brief 14): a `jobs` row is the DB-level lock (partial unique
  index, survives restart), the route returns 202 + jobId, and the pipeline runs
  via `setImmediate` with the client polling for progress. (Superseded the
  original in-memory synchronous lock.) The higher-quality Claude path was
  deliberately dropped with the CLI (single surface > the quality path that needed
  repo-root `chunks/`).
- **Defaults target Ollama Cloud** (`https://ollama.com`, `gpt-oss:120b-cloud`)
  since 2026-06-16 ([briefs/done/08](../briefs/done/08-ollama-cloud-backend.md)).
  `OLLAMA_API_KEY` is sent as a `Bearer` header when set; blank key + a localhost
  `OLLAMA_HOST` falls back to a local server. Same `/api/generate` contract either
  way — the only change is the auth header and the model tag.
- **`node:sqlite` (Node ≥ 24), not `better-sqlite3`** — for now. Migration later
  is mechanical (same API surface).
- **The frontend keeps its own Vite root + tsconfig**, separate from the
  backend's NodeNext tsconfig (DOM lib + react-jsx + Bundler resolution).
- **No conversation parser in the soul pipeline; token estimator counts UTF-8
  bytes / 4** (since brief 33 — diacritics/emoji cost their real BPE budget; no
  tokenizer dep, `gpt-tokenizer` rejected as Llama-mismatched). The only remaining
  chat parser is the standalone WhatsApp/Telegram-style reader in
  `src/stats/conversation-stats.ts`, which feeds the no-LLM statistics feature —
  not extraction.
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
