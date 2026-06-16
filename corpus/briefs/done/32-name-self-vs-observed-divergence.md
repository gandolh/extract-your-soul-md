# 32 — Name concrete self-vs-observed divergences in the reduce prompt

**Priority:** P3 · **Goal:** accuracy · **Impact:** low · **Effort:** S · **Status:** done · **Promoted:** 2026-06-16 (from `todos/name-self-vs-observed-divergence.md`) · **Done:** 2026-06-16

## Outcome (2026-06-16)
One-block prompt edit, shipped as specced. Rewrote the `## Self-Perception vs.
Observed Voice` body inside `REDUCE_QA_SECTIONS` in
[prompts.ts](../../../src/prompts.ts) from an abstract "describe the gap in 2-4
sentences" instruction to a concrete enumeration:

> (List 1-3 SPECIFIC places where the questionnaire self-description diverges
> from observed habits — e.g. "says they write concisely, but answers run to
> long multi-clause sentences" — then state which register a downstream LLM
> should imitate by default: the OBSERVED one. Omit if no concrete divergence
> is evident.)

The section stays orchestrator-gated (only emitted when `hasQuestionnaire`), so
a chat-only corpus never sees it. No new file-format surface, no schema change.
Both typechecks + `build:server` clean. Nothing committed.

**No cache invalidation.** This is a *reduce*-prompt edit. Only the **map**
prompt-header hash fingerprints the per-chunk bullet cache (`.cache/bullets/`);
the reduce step is not cached, so the new wording takes effect on the next
extraction with zero re-mapping. (Contrast briefs 27/30, which touched map
headers and *did* invalidate the cache.)

The "Mirror in SKILL.md" line in the todo is moot — SKILL.md was removed in
brief 04 (collapse-to-API). The reduce prompt in `src/prompts.ts` is now the
sole home of this instruction.

## Problem
The section described the self-vs-observed gap abstractly ("how they'd LIKE to
come across vs. how they actually write"). The research's highest-value insight
is the *concrete* divergence — where a stated aspiration ("I want to read as
concise") contradicts an observed habit ("writes long run-ons"). The prompt
never asked the reducer to enumerate specific cases, so a small model tended to
restate the abstraction rather than ground it.

## Decision / approach (audit-refined — keep ONLY the "name the divergence" half)
Enumerate 1-3 concrete divergences and explicitly default the imitator to the
OBSERVED register. **Explicitly dropped:** encoding a "~38%/~5% observer
advantage" as a blanket confidence weight — that stat measures *trait
inference*, not *style imitation* (a domain conflation the corpus flags as open),
and a "chat-log wins for ALL features" rule would wrongly discount the
questionnaire's own observed prose. The existing `REDUCE_QA_CONFLICT_RULE` +
`REDUCE_PROVENANCE_RULE` already handle weighting at the right granularity.

## Caveat
Unmeasured nudge on a small model — same caveat as the rest of the accuracy
cluster. A/B-testable via the eval harness (brief 05) since the change is in the
reduce prompt only.

## Refs
code: [prompts.ts](../../../src/prompts.ts) · corpus: [self-report-vs-observer-gap](../../wiki/concepts/self-report-vs-observer-gap.md), [open-questions.md](../../wiki/open-questions.md)
