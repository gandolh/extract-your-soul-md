# Build a style-card-vs-raw-text eval harness (the project's central bet, never measured)

**Priority:** P1 · **Goal:** accuracy · **Impact:** high · **Effort:** M · **Status:** todo · **Captured:** 2026-06-16

## Problem
The project's headline claim — a structured style card beats raw text examples
for LLM imitation — is "supported but never measured directly"
([open-questions.md](../wiki/open-questions.md),
[style-card-artifact](../wiki/concepts/style-card-artifact.md)). There is zero
eval/judge/perplexity harness in `src/`. Every prompt change flies blind; you
can't tell whether a reframe improved or regressed imitation, nor tune
model/temperature/chunk-size against any objective signal.

## Decision / approach (grilled 2026-06-16 — "local metrics first, LLM-judge optional")
- Add `src/stages/eval.ts` + an `--eval` flag in [index.ts](../../src/index.ts)
  `parseFlags`. **CLI-only** (matches the Ollama-only programmatic path; do not
  wire into `/api/extract`).
- Hold out N real user messages from `inputs/processed/*.txt` (exclude
  `__questionnaire__.txt`). For each, take a prefix and generate a continuation
  under three conditions via [ollama.ts](../../src/ollama.ts) `generate()`:
  **A** = `out/my-soul.md` spec only · **B** = k raw example messages only ·
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
Add `eval: argv.includes('--eval')` to `parseFlags` and a stub `src/stages/eval.ts`
that loads `inputs/processed/*.txt`, splits a held-out sample, and prints counts —
proving the holdout source is reachable before any LLM call.

## Dependencies & sequencing
**After** the extract fixes — eval needs a working extract + an existing
`out/my-soul.md` for the spec-only (A) condition. Most meaningful once
[deterministic-extraction](deterministic-extraction-temp-seed.md) is in
(removes sampling noise from the comparison).

## Refs
code: [index.ts](../../src/index.ts), [ollama.ts](../../src/ollama.ts), [process.ts](../../src/stages/process.ts) · corpus: [open-questions.md](../wiki/open-questions.md), [style-card-artifact](../wiki/concepts/style-card-artifact.md), [individual-turing-test-2026](../wiki/sources/individual-turing-test-2026.md), [imitate-style-2025](../wiki/sources/imitate-style-2025.md)
