# Build a style-card-vs-raw-text eval harness (the project's central bet, never measured)

**Priority:** P1 · **Goal:** accuracy · **Impact:** high · **Effort:** M · **Status:** done (→ [briefs/done/05](../briefs/done/05-style-card-eval-harness.md), 2026-06-16) · **Captured:** 2026-06-16

## Problem
The project's headline claim — a structured style card beats raw text examples
for LLM imitation — is "supported but never measured directly"
([open-questions.md](../wiki/open-questions.md),
[style-card-artifact](../wiki/concepts/style-card-artifact.md)). There is zero
eval/judge/perplexity harness in `src/`. Every prompt change flies blind; you
can't tell whether a reframe improved or regressed imitation, nor tune
model/temperature/chunk-size against any objective signal.

## Decision / approach (grilled 2026-06-16 — "local metrics first, LLM-judge optional")
- Eval logic in its own module (`src/server/eval.ts`, or a `src/stages/eval.ts`
  invoked by the route), exposed as a synchronous `POST /api/eval` endpoint +
  a frontend view — same pattern as `/api/extract`.
- Hold out N of the user's real messages (from their `conversations` rows, or the
  processed work-dir built during extraction — exclude the questionnaire). For
  each, take a prefix and generate a continuation under three conditions via
  [ollama.ts](../../src/ollama.ts) `generate()`:
  **A** = the user's stored `soul.md` spec only (from the `results` table) ·
  **B** = k raw example messages only ·
  **C** = spec + examples (mirrors the PROSE +9% spec+examples finding).
- **Score with local deterministic metrics first** (free, reproducible, no deps,
  no model bias): burstiness, sentence-length variance, type-token ratio, and
  function-word / char-distribution distance vs the held-out real text (the
  human-vs-style-matched fingerprint the corpus cites — perplexity 15.2 vs 29.5).
  An **optional** LLM-judge layer can come later.
- Print a per-condition table. **Frame as a relative A/B regression signal**
  between prompt/temp/model changes — NOT absolute fidelity (per the individual
  Turing-test ceiling: automated judges only measure stranger-plausibility).
- Reuse the content-hash cache pattern so judge/metric calls are cached.

## First step
Stub the eval module + a `POST /api/eval` route that, for the authed user, pulls
their held-out messages and existing `soul.md`, splits a sample, and returns
counts as JSON — proving both data sources are reachable before any LLM call.

## Dependencies & sequencing
**After** the extract fixes — eval needs a working extract + an existing
stored `soul.md` (from the `results` table) for the spec-only (A) condition. Most
meaningful now that [deterministic-extraction](deterministic-extraction-temp-seed.md)
is in (removes sampling noise from the comparison).

## Refs
code: [server/pipeline.ts](../../src/server/pipeline.ts), [ollama.ts](../../src/ollama.ts), [process.ts](../../src/stages/process.ts), [db/repos.ts](../../src/db/repos.ts) · corpus: [open-questions.md](../wiki/open-questions.md), [style-card-artifact](../wiki/concepts/style-card-artifact.md), [individual-turing-test-2026](../wiki/sources/individual-turing-test-2026.md), [imitate-style-2025](../wiki/sources/imitate-style-2025.md)
