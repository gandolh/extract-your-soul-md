# 31 — Add a Q12 narrative high-point prompt

**Priority:** P2 · **Goal:** accuracy · **Impact:** medium · **Effort:** S · **Status:** done · **Promoted:** 2026-06-16 (from `todos/q12-narrative-high-point.md`) · **Done:** 2026-06-16

## Outcome (2026-06-16)
Pure data change, shipped as specced. Two files:
- [questions.ts](../../../src/questions.ts) — appended Q12 (slug
  `narrative-high-point`, title "Narrative high point"), mirroring Q4's
  close-friend framing but agentive/proud: EN "Tell me about a time something
  went really right — something you're proud of. Write it the way you'd tell a
  close friend." + RO equivalent + both hints. Required (no `optional` flag).
- [studies.ts](../../../src/studies.ts) — added `'Q12'` to the existing
  `how-you-tell-it` study, positioned right after `'Q4'` so the two narrative
  prompts sit together: `['Q4', 'Q12', 'Q5', 'Q6', 'Q7']`. Updated the file's
  header comment (Q1..Q11 → Q1..Q12; next ids Q13+).

No file-format / migration change — the `Q\d+` regex in
[answers-file.ts](../../../src/answers-file.ts) and
[process.ts](../../../src/stages/process.ts) + `MAP_PROMPT_HEADER_QA` already
accept higher ids. Existing users' answer files simply lack the Q12 section
(treated as skip). No `studyOrder.ts` / nav edits (kept it in an existing study,
as the grill decided). Both typechecks + `build:server` clean. Nothing committed.

## Problem
Q4 was the ONLY event-specific narrative prompt and it's biased to the
low-point/failure case ("a time something went wrong") — so it can only observe
contamination-vs-redemption framing of a negative event, never an agentive
high-point. Narrative agency (research-tied to Extraversion-Assertiveness) was
under-sampled.

## Decision / approach (grilled 2026-06-16 — existing study, required, data-only)
Append Q12 mirroring Q4's shape (proud/agentive register), add to the existing
`how-you-tell-it` study as required. A dedicated "narrative theme" study was
rejected (would force studyOrder.ts / nav edits).

## Refs
code: [questions.ts](../../../src/questions.ts), [studies.ts](../../../src/studies.ts) · corpus: [dual-use-signal](../../wiki/concepts/dual-use-signal.md), [life-narratives-prompts-2025](../../wiki/sources/life-narratives-prompts-2025.md), [open-questions.md](../../wiki/open-questions.md)
