# Emit a Representative Samples section (spec + few-shot) — DEFERRED

**Priority:** P3 (gated) · **Goal:** accuracy · **Impact:** medium · **Effort:** M · **Status:** todo (blocked) · **Captured:** 2026-06-16

## Problem
soul.md ships as pure prose with zero representative voice excerpts. The "How To
Imitate" paragraph tells a model how to write but gives nothing concrete to anchor
on. The literature is explicit: PROSE gains +9% paired with few-shot examples
([prose-2025](../wiki/sources/prose-2025.md)); the style card "should travel WITH
a few representative excerpts, not replace them"
([style-card-artifact](../wiki/concepts/style-card-artifact.md)).

## Decision / approach (grilled 2026-06-16 — DEFERRED)
Decided to defer for now ("permit short non-private tokens only" — no samples
section yet). The mechanism also needs care: map bullets are paraphrased, so
naively assembling samples from them would **fabricate** AI-flavored excerpts. To
do it right later:
1. Let map emit 1-2 SHORT verbatim style-tokens per chunk (handled by
   [reframe-prompts-imitation-spec](reframe-prompts-imitation-spec.md)).
2. Add a `## Representative Samples` section to `REDUCE_PROMPT_HEADER` + the
   SKILL.md template (in lockstep), assembling 3-6 short cross-register
   exemplars, entity-stripped.

## Hard gate
**Must not ship before** [ngram-verbatim-overlap-guard](ngram-verbatim-overlap-guard.md)
— excerpts are the single highest re-identification surface
([deanonymization-2026](../wiki/sources/deanonymization-2026.md): 79.2% style-only
re-id). Revisit only after the eval harness can measure the +9% claim (currently
"inferred, not measured").

## Refs
code: [prompts.ts](../../src/prompts.ts), `.claude/skills/extract-soul/SKILL.md` · corpus: [prose-2025](../wiki/sources/prose-2025.md), [style-card-artifact](../wiki/concepts/style-card-artifact.md), [regurgitation-risk](../wiki/concepts/regurgitation-risk.md)
