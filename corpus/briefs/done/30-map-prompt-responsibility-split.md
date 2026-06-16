# 30 — Map-prompt responsibility split + provenance-typed QA bullets

**Priority:** P3 · **Goal:** accuracy · **Impact:** low · **Effort:** S · **Status:** done · **Promoted:** 2026-06-16 (from `todos/map-prompt-responsibility-split.md`) · **Done:** 2026-06-16

## Outcome (2026-06-16)
The todo had two parts. The primary "first step" was **already shipped**; what
remained was the optional provenance half, which is what this brief delivers.

### Part 1 — narrow the chat-prompt values bullet (ALREADY DONE)
The todo flagged `MAP_PROMPT_HEADER` asking for "Values, opinions, recurring
complaints or enthusiasms" — the one genuine cross-prompt content leak (values
are the QA prompt's job; chat fragments are weak evidence for them). On
inspection that bullet is **already** narrowed to "Opinions/enthusiasms only as
directly stated" ([prompts.ts:15](../../../src/prompts.ts#L15)) — fixed earlier by
brief 06 (reframe-prompts). No change needed; the leak is closed and Values &
Worldview is QA-fed. Confirmed the QA voice/style bullets were correctly NOT
stripped (they implement the dual-use signal — Q5 code-switch range, Q10
aspirational register).

### Part 2 — provenance-typed QA bullets (the optional half, SHIPPED)
Implemented the todo's "optional" provenance prefixing, because it operationalizes
the self-report-vs-observer gap the corpus keeps citing (~5% self-report↔style
variance). Two coordinated changes in [prompts.ts](../../../src/prompts.ts):

1. **`MAP_PROMPT_HEADER_QA`** now instructs every bullet to carry a provenance
   prefix: `in-prose:` (a feature OBSERVED in how they actually wrote the answer —
   strong evidence) or `self-described:` (what they CLAIM about themselves —
   weaker self-report). The voice-feature bullets are pre-tagged `in-prose:`, the
   propositional-content bullets `self-described:`.
2. **`buildReducePrompt`** gains a new gated `REDUCE_PROVENANCE_RULE`: trust
   `in-prose:` over `self-described:` for any observable-style judgment, treat
   `self-described:` as weaker self-report (fold into values/aspiration, not
   how-they-write, unless an `in-prose:` bullet corroborates), and **strip the
   prefixes from the final document**.

### Gating subtlety (deliberate)
The existing chat-vs-QA batch conflict rule (`REDUCE_QA_CONFLICT_RULE`) is gated
to appear only when both source kinds exist. The new provenance rule is gated on
`hasQuestionnaire` but **independent** of it — the `in-prose:`/`self-described:`
distinction is useful even in a questionnaire-ONLY corpus (no chat logs), where
`in-prose:` observations should still beat `self-described:` claims for style.
Both rules are interpolated separately at the Rules block.

Batch-level provenance already existed (extract.ts labels each batch
`from questionnaire` / `from chat logs`); this adds the missing **bullet-level**
granularity within QA batches. Both typechecks + `build:server` clean. Nothing
committed.

## Honest limit
Effect is an unmeasured nudge on a small model's adherence to the prefixes — a
future eval-harness A/B (brief 05) against the new QA-header + reduce-header
hashes should confirm it. If `llama3.1:8b` ignores the prefix instruction the
rule is inert (but harmless).

## Problem
`MAP_PROMPT_HEADER` once asked for values content the QA prompt owns; chat
fragments are weak evidence for values. Reduce also couldn't tell, within a QA
batch, observed-prose features from self-report claims once bullets were flattened.

## Decision / approach (audit-refined — narrow scope)
- Narrow the chat values bullet to "opinions/enthusiasms only as directly stated"
  (already done by brief 06).
- Do NOT strip the QA voice/style bullets (dual-use signal).
- Optional: prefix QA style bullets with provenance so the reduce tie-break
  operates on typed inputs — **this brief shipped that.**

## Refs
code: [prompts.ts](../../../src/prompts.ts), [extract.ts](../../../src/stages/extract.ts) · corpus: [dual-use-signal](../../wiki/concepts/dual-use-signal.md), [self-report-vs-observer-gap](../../wiki/concepts/self-report-vs-observer-gap.md), [03-integration-plan](../../wiki/sources-raw/03-integration-plan.md)
