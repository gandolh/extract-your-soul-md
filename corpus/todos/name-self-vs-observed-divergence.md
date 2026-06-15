# Name concrete self-vs-observed divergences in the reduce prompt

**Priority:** P3 · **Goal:** accuracy · **Impact:** low · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
The "Self-Perception vs. Observed Voice" section
([prompts.ts:88-92](../../src/prompts.ts#L88-L92)) describes the gap abstractly.
The research's highest-value insight is where a user's *self-described aspiration*
("I want to read as concise") diverges from *observed habits* ("writes long
run-ons") — but the prompt never asks the reducer to enumerate concrete cases.

## Decision / approach (audit-refined — keep ONLY the "name the divergence" half)
- Edit the section body to: "List 1-3 specific places where the questionnaire
  self-description diverges from observed chat habits, then state which register a
  downstream LLM should imitate by default — the observed one." Mirror in SKILL.md.
- **Explicitly dropped:** the "encode ~38%/~5% observer advantage as a confidence
  weight" idea. That stat measures *trait inference*, not *style imitation* (the
  corpus flags the domain conflation as an open question), and a blanket
  "chat-log higher-confidence for ALL features" rule would wrongly discount the
  questionnaire's own observed prose ([self-report-vs-observer-gap](../wiki/concepts/self-report-vs-observer-gap.md)).

## First step
Edit the "## Self-Perception vs. Observed Voice" body in
[prompts.ts](../../src/prompts.ts) to enumerate concrete divergence points.

## Dependencies & sequencing
Only fires when both questionnaire + chat batches exist and diverge. After
[single-source-reduce-template](single-source-reduce-template.md).

## Refs
code: [prompts.ts](../../src/prompts.ts), `.claude/skills/extract-soul/SKILL.md` · corpus: [self-report-vs-observer-gap](../wiki/concepts/self-report-vs-observer-gap.md)
