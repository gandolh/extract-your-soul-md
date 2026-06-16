# 28 — Add a compact Drift Anchor re-injection block

**Priority:** P2 · **Goal:** accuracy · **Impact:** medium · **Effort:** S · **Status:** done · **Promoted:** 2026-06-16 (from `todos/drift-anchor-reinjection.md`) · **Done:** 2026-06-16

## Outcome (2026-06-16)
Both halves shipped (artifact vs. usage guidance, as the audit split them).
- **Artifact:** appended a `## Drift Anchor` section to the reduce prompt in
  [prompts.ts](../../../src/prompts.ts), right after How To Imitate. It instructs
  a **compressed restatement** (5-8 lines, explicitly NOT a near-duplicate) of
  the highest-signal signature vocab/punctuation/cadence plus the one-line
  imitation directive — re-pasteable. No extra LLM call; material is already in
  the reduce context. Lives in the shared body of `buildReducePrompt`, so it
  appears for both chat-only and questionnaire corpora.
- **Usage note:** added to the soul.md review paragraph in
  [ResultsPage.tsx](../../../frontend/src/pages/ResultsPage.tsx) — "In a long
  chat, re-paste the Drift Anchor block every dozen-or-so turns to keep the voice
  from drifting back to generic." Kept the artifact itself a clean voice card;
  the "re-paste every N turns" advice is UI-only.

The source todo's `SKILL.md` mirror is moot — `SKILL.md` no longer exists
(removed in brief 04). Both typechecks clean. Nothing committed.

## Problem
Observer-rated voice degrades over long generations regardless of model — drift
is architectural. soul.md had no compact re-injection block, so a consumer who
pastes the full card once sees voice decay with no countermeasure.

## Decision / approach (audit-refined — split artifact vs usage guidance)
- **Artifact:** append a `## Drift Anchor` section to the reduce prompt — a
  compressed restatement of How-To-Imitate, NOT a near-duplicate.
- **Usage note** ("re-paste every N turns") goes in the **UI**
  ([ResultsPage.tsx](../../../frontend/src/pages/ResultsPage.tsx)), not the
  artifact — so soul.md stays a clean voice artifact.

## Dependencies & sequencing
Smaller-bore than shipping few-shot samples (the bigger drift lever) — see the
still-open `representative-samples-fewshot` todo.

## Refs
code: [prompts.ts](../../../src/prompts.ts), [ResultsPage.tsx](../../../frontend/src/pages/ResultsPage.tsx) · corpus: [llm-persona-techniques](../../wiki/frameworks/llm-persona-techniques.md)
