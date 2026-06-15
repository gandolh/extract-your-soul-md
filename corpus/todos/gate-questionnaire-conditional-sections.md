# Orchestrator-gate the questionnaire-only sections (don't let the model decide)

**Priority:** P2 · **Goal:** accuracy · **Impact:** medium · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
The three questionnaire-only sections (Core Motivation & Fears, Communication
Style, Self-Perception vs. Observed Voice) are gated by asking the model to read
prose labels ([prompts.ts:77-92](../../src/prompts.ts#L77-L92)). A small model
like `llama3.1:8b` emits them anyway, **hallucinating a core motivation/fear from
a chat-only corpus**. The manifest already carries `kind` per chunk
([chunk.ts:154-159](../../src/stages/chunk.ts#L154-L159)), so the gate can be a
machine decision, not a model judgment.

## Decision / approach (audit-refined)
- Refactor `REDUCE_PROMPT_HEADER` into `buildReducePrompt(hasQuestionnaire)` in
  [prompts.ts](../../src/prompts.ts); the chat-only variant omits the three
  section blocks AND the moot questionnaire-vs-chat conflict rule.
- In [extract.ts](../../src/stages/extract.ts) compute
  `const hasQuestionnaire = manifest.chunks.some(c => c.kind === 'questionnaire')`
  and build the prompt from it.
- Mirror in `.claude/skills/extract-soul/SKILL.md` step 3 (check manifest kind
  first) so Path A and Path B stay aligned.
- Honest limit: this kills the all-chat hallucination only; within-questionnaire
  over-inclusion still rests on the model.

## First step
Split `REDUCE_PROMPT_HEADER` into a `buildReducePrompt(hasQuestionnaire)` builder.

## Dependencies & sequencing
Easier after [single-source-reduce-template](single-source-reduce-template.md)
(else edit both copies).

## Refs
code: [prompts.ts](../../src/prompts.ts), [extract.ts](../../src/stages/extract.ts), `.claude/skills/extract-soul/SKILL.md`
