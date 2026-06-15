# Fix the one true cross-prompt content leak (map prompt responsibility)

**Priority:** P3 · **Goal:** accuracy · **Impact:** low · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
`MAP_PROMPT_HEADER` asks for "Values, opinions, recurring complaints or
enthusiasms" ([prompts.ts:10](../../src/prompts.ts#L10)) — content the QA prompt is
supposed to own — and chat fragments are weak evidence for values anyway. This is
the one genuine cross-prompt leak.

## Decision / approach (audit-refined — narrow scope; most of the original idea was research-contradicted)
- Narrow or remove the values bullet at [prompts.ts:10](../../src/prompts.ts#L10)
  (and `soul-chunk-extractor.md:37`) to "opinions/enthusiasms only as directly
  stated"; let Values & Worldview be QA-fed.
- **Do NOT** strip the QA prompt's voice/style bullets
  ([prompts.ts:38,40,42](../../src/prompts.ts#L38-L42)) — those implement the
  dual-use signal (Q5 code-switch *range*, Q10 aspirational register = blind-spot
  fills the chats can't see — [dual-use-signal](../wiki/concepts/dual-use-signal.md)).
- Optional: prefix QA style bullets with provenance ("self-described:" /
  "in-prose:") so the reduce tie-break operates on typed inputs.

## First step
Narrow [prompts.ts:10](../../src/prompts.ts#L10) + mirror at
`soul-chunk-extractor.md:37`.

## Refs
code: [prompts.ts](../../src/prompts.ts), `.claude/agents/soul-chunk-extractor.md` · corpus: [dual-use-signal](../wiki/concepts/dual-use-signal.md), [03-integration-plan](../wiki/sources-raw/03-integration-plan.md)
