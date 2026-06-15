# Calibrate output volume to corpus size; forbid count-padding

**Priority:** P2 · **Goal:** accuracy · **Impact:** medium · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
Both map prompts demand fixed bullet counts — 5-15
([prompts.ts:4](../../src/prompts.ts#L4)) and 8-20
([prompts.ts:31](../../src/prompts.ts#L31)) — regardless of how much a chunk
contains. A one-question questionnaire or small chat export gets **padded into
8-20 confident bullets of invented voice**. Padding compounds a known-weak signal
(self-report ↔ style ≈ 5% variance) and feeds the rule-of-three/low-variability
AI tells. Matters most for new web users with one study answered.

## Decision / approach (audit-refined)
- Replace the fixed counts at [prompts.ts:4](../../src/prompts.ts#L4) and
  [prompts.ts:31](../../src/prompts.ts#L31) with: "Emit only well-supported
  observations — fewer is better. If the chunk is thin, return few bullets; do
  NOT pad to a count. Cover, when evident:".
- **Also edit `.claude/agents/soul-chunk-extractor.md`** (lines 30 & 43 hardcode
  the same counts and lack the don't-pad rule) — that's the real Path A target.
  `SKILL.md:120` already carries the sparseness rule for the reduce step.

## First step
Change [prompts.ts:4](../../src/prompts.ts#L4) count line to the anti-padding
wording; mirror at lines 31 and in soul-chunk-extractor.md.

## Dependencies & sequencing
Pure prompt text. After [cache-fingerprint](cache-fingerprint-prompt-model-ctx.md).

## Refs
code: [prompts.ts](../../src/prompts.ts), `.claude/agents/soul-chunk-extractor.md` · corpus: [self-report-vs-observer-gap](../wiki/concepts/self-report-vs-observer-gap.md), [ai-tells](../wiki/concepts/ai-tells.md)
