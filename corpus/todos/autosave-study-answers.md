# Autosave study answers + unsaved-changes guard

**Priority:** P1 · **Goal:** ease-of-use · **Impact:** high · **Effort:** S · **Status:** done (→ [briefs/done/12](../briefs/done/12-autosave-study-answers.md), 2026-06-16) · **Captured:** 2026-06-16

## Problem
[StudyPage.tsx](../../frontend/src/pages/StudyPage.tsx) holds all answers in local
state (line 14) and only persists on an explicit Save click. The whole product
depends on long, rambling written answers — the highest-effort, highest-signal
user input ([genai-openended-scoring-2025](../wiki/sources/genai-openended-scoring-2025.md))
— yet clicking the nav bar, the Previous link, or closing the tab **silently
discards unsaved edits**. No autosave, no dirty tracking, no `beforeunload`
warning. The save endpoint accepts the full question set with blanks treated as
skipped, so partial debounced saves are safe and lossless.

## Decision / approach (audit-refined)
Two independent additive layers:
1. **Debounced autosave** — factor a `persist()` (the `api.saveStudy` call minus
   navigate/toast side-effects); a `useEffect` keyed on `answers` schedules a
   ~1500ms save, guarded against firing on the initial seed (compare to a
   baseline ref captured from the line 27-29 init map). Show a subtle
   `idle/saving/saved` status near the Meter — silent, not a toast.
2. **`beforeunload` guard** — `preventDefault` when dirty (router-agnostic,
   covers tab-close).
- **Skip `useBlocker`**: the app uses `BrowserRouter` + `<Routes>` (declarative),
  and react-router v7 `useBlocker` needs a data router. Debounced autosave makes
  in-app nav loss a non-issue anyway.

## First step
Add a `persist()` helper + a debounced `useEffect` on `answers` in
[StudyPage.tsx](../../frontend/src/pages/StudyPage.tsx); capture the seed baseline
in a ref.

## Dependencies & sequencing
Edge cases: reset the timer + baseline when `studyId` changes; update the
baseline after each successful save; clear any pending timer on manual save/nav.
Backend is upsert-per-question (last-write-wins), so overlapping saves are safe.

## Refs
code: [StudyPage.tsx](../../frontend/src/pages/StudyPage.tsx), [client.ts](../../frontend/src/api/client.ts), [studies.ts](../../src/server/routes/studies.ts) · corpus: [genai-openended-scoring-2025](../wiki/sources/genai-openended-scoring-2025.md)
