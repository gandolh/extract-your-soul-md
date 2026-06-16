# Synthesis-time n-gram verbatim-overlap guard

**Priority:** P3 · **Goal:** accuracy (privacy) · **Impact:** low · **Effort:** M · **Status:** todo · **Captured:** 2026-06-16

## Problem
Anti-regurgitation is a single soft instruction repeated 3× in
[prompts.ts](../../src/prompts.ts) with zero enforcement. A small model can leak
input spans verbatim despite it. The research calls verbatim-prevention
necessary-but-not-sufficient ([privacy-not-just-memorization](../wiki/sources/privacy-not-just-memorization.md))
— and style alone re-identifies 79.2%
([deanonymization-2026](../wiki/sources/deanonymization-2026.md)), so this does
NOT replace the real safety net (gitignore + manual review).

## Decision / approach (audit-refined — n-gram only, drop NER)
- After the reduce call (before `writeFileSync` in
  [extract.ts](../../src/stages/extract.ts)), build a Set of 6-8 gram shingles
  from the concatenated source chunk text and flag/strip any soul span whose
  shingle appears verbatim in the source. Language-agnostic (works for RO /
  code-switch), deterministic, no new dependency.
- **Drop entity-NER redaction** — multilingual NER is L-effort and error-prone,
  and redacting names doesn't remove style-based re-identifiability anyway.
- Enforced in `runOllamaPipeline` (the only extraction path), so it's a real
  post-generation check rather than a soft prompt instruction.

## First step
Add a 7-gram shingle scan over the soul output vs source text in
`runOllamaPipeline`, logging hits before deciding strip-vs-reprompt.

## Dependencies & sequencing
**Prerequisite for** [representative-samples-fewshot](representative-samples-fewshot.md).
Tune n-gram size to avoid stripping legitimately-short common phrases.

## Refs
code: [extract.ts](../../src/stages/extract.ts), [prompts.ts](../../src/prompts.ts) · corpus: [regurgitation-risk](../wiki/concepts/regurgitation-risk.md), [privacy-not-just-memorization](../wiki/sources/privacy-not-just-memorization.md)
