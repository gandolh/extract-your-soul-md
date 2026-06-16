# 26 — Orchestrator-gate the questionnaire-only reduce sections

**Priority:** P2 · **Goal:** accuracy · **Impact:** medium · **Effort:** S · **Status:** done · **Promoted:** 2026-06-16 (from `todos/gate-questionnaire-conditional-sections.md`) · **Done:** 2026-06-16

## Outcome (2026-06-16)
Shipped in [prompts.ts](../../../src/prompts.ts) + [extract.ts](../../../src/stages/extract.ts).
Replaced the static `REDUCE_PROMPT_HEADER` const with a
`buildReducePrompt(hasQuestionnaire)` builder. The three questionnaire-derived
sections (Core Motivation & Fears, Communication Style, Self-Perception vs.
Observed Voice) were extracted into a `REDUCE_QA_SECTIONS` fragment, and the
questionnaire-vs-chat conflict-reconciliation rule into a
`REDUCE_QA_CONFLICT_RULE` fragment; both are interpolated **only** when
`hasQuestionnaire` is true. [extract.ts](../../../src/stages/extract.ts) computes
`const hasQuestionnaire = manifest.chunks.some((c) => c.kind === 'questionnaire')`
— a machine decision from the manifest `kind` field, not a prose label the model
is asked to honor. Both typechecks clean (`build:server`, `typecheck:web`).
Nothing committed.

Honest limit (carried from the todo): this kills the **all-chat** hallucination
only — for a chat-only corpus the model never sees the section instructions at
all. Within-questionnaire over-inclusion still rests on the model's "omit if not
evident" judgment.

Note: the source todo's `SKILL.md` mirror is moot — `SKILL.md` no longer exists
(removed in brief 04, collapse-to-API). No skill surface to mirror.

## Problem
The three questionnaire-only sections were gated by asking the model to read
prose labels ("only include if the questionnaire batches supplied this"). A small
model like `llama3.1:8b` emits them anyway, **hallucinating a core
motivation/fear from a chat-only corpus**. The manifest already carries `kind`
per chunk, so the gate can be a machine decision.

## Decision / approach (audit-refined)
- Refactor `REDUCE_PROMPT_HEADER` into `buildReducePrompt(hasQuestionnaire)`;
  the chat-only variant omits the three section blocks AND the moot
  questionnaire-vs-chat conflict rule.
- In [extract.ts](../../../src/stages/extract.ts) compute `hasQuestionnaire`
  from the manifest and build the prompt from it.

## Refs
code: [prompts.ts](../../../src/prompts.ts), [extract.ts](../../../src/stages/extract.ts)
