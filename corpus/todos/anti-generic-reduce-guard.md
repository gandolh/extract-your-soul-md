# Anti-generic / anti-AI-flavor guard in the reduce prompt

**Priority:** P2 · **Goal:** accuracy · **Impact:** medium · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
`REDUCE_PROMPT_HEADER` asks for smooth prose summaries
([prompts.ts:63](../../src/prompts.ts#L63)) — exactly where a small model
regresses toward bland, average output, so soul.md describes a generic "casual,
warm, occasionally sarcastic" person. Nothing instructs it to retain
distinctive/rare features over common ones or avoid hedging.

## Decision / approach (audit-refined — keep the prompt half, drop the cross-link half)
- Append to the "Rules:" block ([prompts.ts:103-107](../../src/prompts.ts#L103-L107))
  and mirror in `.claude/skills/extract-soul/SKILL.md`: "Prefer specific over
  vague. Drop any descriptor that would apply to most people. Keep
  distinctive/rare/surprising features over common ones. Never pad a section to
  fit the template — omit it."
- Optional addition to "How To Imitate": tell the downstream model to vary
  sentence length/rhythm (avoid uniform cadence).
- **Do NOT** cross-link an `ai-patterns.md` — that file does not exist in this
  repo, and the `add-soul`/humanize step lives in an external plugin. soul.md
  stays a self-contained artifact; anti-tell stripping belongs in that separate
  step, not the extractor.

## First step
Add the anti-generic rule to the `REDUCE_PROMPT_HEADER` "Rules:" list
(~[prompts.ts:106](../../src/prompts.ts#L106)).

## Dependencies & sequencing
Effect is an unmeasured nudge — verify via
[style-card-eval-harness](style-card-eval-harness.md). After
[cache-fingerprint](cache-fingerprint-prompt-model-ctx.md).

## Refs
code: [prompts.ts](../../src/prompts.ts), `.claude/skills/extract-soul/SKILL.md` · corpus: [ai-tells](../wiki/concepts/ai-tells.md), [imitate-style-2025](../wiki/sources/imitate-style-2025.md)
