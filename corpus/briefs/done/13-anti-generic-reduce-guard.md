# 13 — Anti-generic / anti-AI-flavor guard in the reduce prompt

**Priority:** P2 · **Goal:** accuracy · **Impact:** medium · **Effort:** S · **Status:** done · **Promoted:** 2026-06-16 (from `todos/anti-generic-reduce-guard.md`) · **Done:** 2026-06-16

## Outcome (2026-06-16)
Both halves shipped in [prompts.ts](../../../src/prompts.ts). Added one rule to
the `REDUCE_PROMPT_HEADER` "Rules:" block (right before "Output ONLY the markdown
document"): _"Prefer specific over vague. Drop any descriptor that would apply to
most people. Keep distinctive/rare/surprising features over common ones. Never
pad a section to fit the template — omit it."_ Also added the optional cadence
nudge to "How To Imitate": include natural sentence-length/rhythm variation,
avoid uniform evenly-paced cadence (reads as generic AI prose). Backend typecheck
clean. Cross-link half correctly dropped (no `ai-patterns.md` in this repo).
Effect is an unmeasured nudge — next time the eval harness (brief 05) runs,
compare against this header hash. Nothing committed.

## Problem
`REDUCE_PROMPT_HEADER` asks for smooth prose summaries
([prompts.ts:66](../../../src/prompts.ts#L66)) — exactly where a small model
regresses toward bland, average output, so soul.md describes a generic "casual,
warm, occasionally sarcastic" person. Nothing instructs it to retain
distinctive/rare features over common ones or avoid hedging.

## Decision / approach (audit-refined — keep the prompt half, drop the cross-link half)
- Append to the "Rules:" block ([prompts.ts:119-123](../../../src/prompts.ts#L119-L123)):
  "Prefer specific over vague. Drop any descriptor that would apply to most
  people. Keep distinctive/rare/surprising features over common ones. Never pad
  a section to fit the template — omit it."
- Optional addition to "How To Imitate": tell the downstream model to vary
  sentence length/rhythm (avoid uniform cadence).
- **Do NOT** cross-link an `ai-patterns.md` — that file does not exist in this
  repo, and the `add-soul`/humanize step lives in an external plugin. soul.md
  stays a self-contained artifact; anti-tell stripping belongs in that separate
  step, not the extractor.

## First step
Add the anti-generic rule to the `REDUCE_PROMPT_HEADER` "Rules:" list
(~[prompts.ts:123](../../../src/prompts.ts#L123)).

## Dependencies & sequencing
Effect is an unmeasured nudge — verify via
[style-card-eval-harness](../../todos/style-card-eval-harness.md) (shipped as
brief 05). After [cache-fingerprint](../done/01-cache-fingerprint-prompt-model-ctx.md)
(shipped) — the prompt-header hash is part of the cache key, so this edit
correctly invalidates only the reduce stage.

## Refs
code: [prompts.ts](../../../src/prompts.ts) · corpus: [ai-tells](../../wiki/concepts/ai-tells.md), [imitate-style-2025](../../wiki/sources/imitate-style-2025.md)
