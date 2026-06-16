# 27 — Calibrate output volume to corpus size; forbid count-padding

**Priority:** P2 · **Goal:** accuracy · **Impact:** medium · **Effort:** S · **Status:** done · **Promoted:** 2026-06-16 (from `todos/forbid-bullet-count-padding.md`) · **Done:** 2026-06-16

## Outcome (2026-06-16)
Shipped in [prompts.ts](../../../src/prompts.ts). Both fixed-count lines replaced
with anti-padding wording:
- `MAP_PROMPT_HEADER` (was "Output 5-15 bullet points covering, when evident:")
  → "Emit only well-supported observations — fewer is better. If the chunk is
  thin, return few bullets; do NOT pad to a count. Cover, when evident:".
- `MAP_PROMPT_HEADER_QA` (was "Output 8-20 bullet points. Lead with VOICE
  FEATURES…") → "Emit only well-supported observations — fewer is better. If the
  answers are thin, return few bullets; do NOT pad to a count. Lead with VOICE
  FEATURES drawn from the prose itself, when evident:".

Pure prompt text. Backend typecheck clean. Effect is an unmeasured nudge —
compare against the new header hash next time the eval harness (brief 05) runs.
Nothing committed.

## Problem
Both map prompts demanded fixed bullet counts (5-15 and 8-20) regardless of how
much a chunk contains. A one-question questionnaire or small chat export got
**padded into 8-20 confident bullets of invented voice** — compounding a
known-weak signal (self-report ↔ style ≈ 5% variance) and feeding the
rule-of-three / low-variability AI tells. Worst for new web users with one study
answered.

## Decision / approach (audit-refined)
Replace the fixed counts with: "Emit only well-supported observations — fewer is
better. If the chunk is thin, return few bullets; do NOT pad to a count. Cover,
when evident:" — mirrored across both map prompts.

## Refs
code: [prompts.ts](../../../src/prompts.ts) · corpus: [self-report-vs-observer-gap](../../wiki/concepts/self-report-vs-observer-gap.md), [ai-tells](../../wiki/concepts/ai-tells.md)
