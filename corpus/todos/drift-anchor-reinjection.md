# Add a compact Drift Anchor re-injection block

**Priority:** P2 · **Goal:** accuracy · **Impact:** medium · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
The product's goal is voice consistency "across sessions", but observer-rated
voice degrades over long generations regardless of model — drift is
architectural ([llm-persona-techniques](../wiki/frameworks/llm-persona-techniques.md),
[stable-personas-2026](../wiki/sources/stable-personas-2026.md)). soul.md has no
compact re-injection block, so a consumer who pastes the full card once sees
voice decay with no countermeasure.

## Decision / approach (audit-refined — split artifact vs usage guidance)
- **Artifact:** append a `## Drift Anchor` section to `REDUCE_PROMPT_HEADER`
  ([prompts.ts](../../src/prompts.ts), after How To Imitate) + mirror in
  `SKILL.md` — ~5-8 lines distilling top signature vocab/punctuation + the
  imitation directive, in a re-pasteable form. The prompt must say it's a
  **compressed restatement** of How-To-Imitate (not a near-duplicate). No extra
  LLM call; material is already in reduce context.
- **Usage note** ("re-paste every N turns") goes in the **UI**, not the artifact
  — [ResultsPage.tsx](../../frontend/src/pages/ResultsPage.tsx) usage paragraph /
  `SKILL.md` report step — so soul.md stays a clean voice artifact.

## First step
Append the `## Drift Anchor` section instruction to `REDUCE_PROMPT_HEADER`.

## Dependencies & sequencing
Smaller-bore than shipping few-shot samples (the bigger drift lever) —
see [representative-samples-fewshot](representative-samples-fewshot.md).

## Refs
code: [prompts.ts](../../src/prompts.ts), [ResultsPage.tsx](../../frontend/src/pages/ResultsPage.tsx), `.claude/skills/extract-soul/SKILL.md` · corpus: [llm-persona-techniques](../wiki/frameworks/llm-persona-techniques.md)
