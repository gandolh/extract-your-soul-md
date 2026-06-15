# Hierarchical tree-reduce for large corpora — DEFERRED

**Priority:** P3 · **Goal:** accuracy · **Impact:** medium · **Effort:** M · **Status:** todo · **Captured:** 2026-06-16

## Problem
The reduce step concatenates every chunk's bullets + header into one prompt
([extract.ts:65](../../src/stages/extract.ts#L65)). With the chunk budget clamped
to fit `num_ctx` (see
[extraction-context-budget-truncation](extraction-context-budget-truncation.md)),
a large corpus produces more chunks → more bullets → the reduce prompt itself can
exceed `num_ctx` (~35 chunks at 8192). The truncation todo handles this with an
**assert-fail backstop** (no silent loss) — this todo is the proper fix that
removes the ceiling.

## Decision / approach (grilled 2026-06-16 — "hierarchical later")
- Tree-reduce: batch the per-chunk bullets into `num_ctx`-sized groups, reduce
  each group to an intermediate summary, then reduce the intermediates (recurse if
  needed). No corpus-size ceiling.
- Mirror in the Claude SKILL.md path for parity.

## First step
In `runOllamaPipeline`, when the bullet set + reduce header exceeds `num_ctx`,
partition bullets into fitting batches and run an intermediate reduce per batch.

## Dependencies & sequencing
Builds on
[extraction-context-budget-truncation](extraction-context-budget-truncation.md)
(the assert-fail backstop ships first; this lifts the ceiling when heavy users hit
it).

## Refs
code: [extract.ts](../../src/stages/extract.ts), [prompts.ts](../../src/prompts.ts), `.claude/skills/extract-soul/SKILL.md`
