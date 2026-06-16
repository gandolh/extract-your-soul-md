# 25 — Study depth guidance: word counter, hints, non-blocking thin cue

**Priority:** P2 · **Goal:** ease-of-use · **Impact:** medium · **Effort:** S · **Status:** done · **Promoted:** 2026-06-16 (from `todos/study-depth-guidance-hints.md`) · **Done:** 2026-06-16

## Problem
The premise needs rich answers, but the checkmark/meter flipped on any non-empty
character (a one-word answer earned a green ✓), 9 of 11 questions had no hint, and
the textarea was small with a generic placeholder.

## Outcome (2026-06-16)
- **Filled `hintEn/hintRo` for Q2–Q10** in `questions.ts` (the field already
  renders in StudyPage — a pure data change that lights up all three forms).
- StudyPage: live **word count** per textarea; a subtle **"a few more sentences
  would help"** cue when a non-optional answer is under ~25 words. **Non-blocking —
  the checkmark is NOT gated** (research stance: write as much or as little as you
  want; gating pushes padded prose). Bigger textarea (min-h 110→150) + a
  take-your-time placeholder.
- Kept the binary checkmark/meter (consistent with the two backend counts).

Verified in-browser (Playwright): a 5-word answer shows "5 words" + the thin cue
AND still earns the ✓ (non-blocking confirmed); a 35-word answer drops the cue,
keeps the count. Q2/Q3 hints render. Both typechecks + build clean. Nothing committed.

## Refs
code: [questions.ts](../../../src/questions.ts), [StudyPage.tsx](../../../frontend/src/pages/StudyPage.tsx) · corpus: [02-questionnaire-design](../../wiki/sources-raw/02-questionnaire-design.md), [dual-use-signal](../../wiki/concepts/dual-use-signal.md)
