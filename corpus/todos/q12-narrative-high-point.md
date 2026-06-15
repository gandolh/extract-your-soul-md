# Add a Q12 narrative high-point prompt

**Priority:** P2 · **Goal:** accuracy · **Impact:** medium · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
Q4 ([questions.ts:48-55](../../src/questions.ts#L48-L55)) is the ONLY
event-specific narrative prompt and it's biased to the low-point/failure case
("a time something went wrong"). It can only observe contamination-vs-redemption
framing of a negative event, never an **agentive high-point** — so narrative
agency (which the research ties to Extraversion-Assertiveness) is under-sampled.
Flagged as a live thread in [open-questions.md](../wiki/open-questions.md) and
[life-narratives-prompts-2025](../wiki/sources/life-narratives-prompts-2025.md).

## Decision / approach (grilled 2026-06-16 — existing study, required, data-only)
- Append Q12 (slug `narrative-high-point`) to `QUESTIONS` in
  [questions.ts](../../src/questions.ts), mirroring Q4's shape (RO + EN,
  close-friend framing, proud/agentive register). e.g. EN: "Tell me about a time
  something went really right — something you're proud of. Write it the way
  you'd tell a close friend."
- Add `'Q12'` to the **existing** `how-you-tell-it` study in
  [studies.ts](../../src/studies.ts) (next to Q4) — **required**, not optional.
- Pure data: the `Q\d+` regex ([answers-file.ts:57](../../src/answers-file.ts#L57),
  [process.ts:56](../../src/stages/process.ts#L56)) and `MAP_PROMPT_HEADER_QA`
  already accept higher ids. No file-format / migration change; existing users'
  files simply lack the section (treated as skip).
- A dedicated "narrative theme" study was rejected — it would require editing
  [studyOrder.ts](../../frontend/src/studyOrder.ts) or nav breaks.

## First step
Append the Q12 entry to [questions.ts](../../src/questions.ts), then add `'Q12'`
to the `how-you-tell-it` study's `questionIds`.

## Refs
code: [questions.ts](../../src/questions.ts), [studies.ts](../../src/studies.ts) · corpus: [dual-use-signal](../wiki/concepts/dual-use-signal.md), [life-narratives-prompts-2025](../wiki/sources/life-narratives-prompts-2025.md), [open-questions.md](../wiki/open-questions.md)
