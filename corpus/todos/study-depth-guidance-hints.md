# Study depth guidance: word counter, per-question hints, non-blocking "thin" cue

**Priority:** P2 · **Goal:** ease-of-use · **Impact:** medium · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
The premise needs rich answers, yet
[StudyPage.tsx](../../frontend/src/pages/StudyPage.tsx) flips the answered
checkmark + meter on any non-empty character — a one-word answer earns a green ✓
and advances the meter, so the progress signal misleads on quality. The textarea
is ~3-4 lines with a generic placeholder, and **9 of 11 questions have no hint**
(only Q1/Q11 carry `hintEn/hintRo`). The questionnaire-design spec specifies a
sub-30-word probe neither front door implements.

## Decision / approach (audit-refined — must stay non-blocking)
- Add a live word count per textarea with a gentle target ("a few sentences
  helps"). **Do NOT gate** the checkmark — the research stance is "write as much
  or as little as you want" ([dual-use-signal](../wiki/concepts/dual-use-signal.md));
  a blocking gate pushes padded prose. Add only a subtle "thin" hint when a
  non-optional answer is under ~25-30 words (research reference is <30, not 15).
- Keep the binary checkmark/meter to stay consistent with the two backend counts
  ([studies.ts:30,80](../../src/server/routes/studies.ts#L30)).
- Bump the textarea min-height; add per-question placeholders.
- **Fill `hintEn/hintRo` for the nine missing questions (Q2-Q10)** in
  [questions.ts](../../src/questions.ts) — hints already render in **both** front
  doors (StudyPage + the REPL), so this single data change improves both.

## First step
Add `hintEn/hintRo` to Q2-Q10 in [questions.ts](../../src/questions.ts) (field
already exists, served + rendered by both front doors).

## Refs
code: [questions.ts](../../src/questions.ts), [StudyPage.tsx](../../frontend/src/pages/StudyPage.tsx), [interview.ts](../../src/stages/interview.ts) · corpus: [02-questionnaire-design](../wiki/sources-raw/02-questionnaire-design.md), [dual-use-signal](../wiki/concepts/dual-use-signal.md)
