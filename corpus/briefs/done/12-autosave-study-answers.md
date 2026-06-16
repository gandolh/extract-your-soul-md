# Brief 12 — Autosave study answers + unsaved-changes guard

**Promoted from:** [todos/autosave-study-answers.md](../../todos/autosave-study-answers.md)
**Priority:** P1 · **Goal:** ease-of-use · **Impact:** high · **Effort:** S · **Captured:** 2026-06-16 · **Promoted:** 2026-06-16 · **Done:** 2026-06-16

## Outcome (2026-06-16)
Implemented frontend-only in [StudyPage.tsx](../../../frontend/src/pages/StudyPage.tsx).
- `persist()` (toast/navigate-free) shared by autosave + manual save; returns the
  saved snapshot and updates a `baseline` ref.
- Debounced autosave: `useEffect` on `answers`, 1500ms timer, fires only when the
  current answers differ from `baseline` (so the seed + study-switch never save).
  Subtle `idle | saving | saved` indicator next to the Meter (aria-live, no toast).
- `beforeunload` guard prompts only while `answers !== baseline` (covers a
  mid-debounce tab close). Manual save cancels any pending autosave timer.
  `useBlocker` skipped (declarative router; autosave covers in-app nav).
- Load effect resets baseline + timer + status on `studyId` change.

Verified: `npm run typecheck:web` + `npm run build` clean. Live-tested the
underlying save: a partial autosave (Q1 filled, Q2/Q3 blank) round-trips and
persists, blanks stay skipped (`answered: 1`), confirming debounced partial saves
are lossless. Edge cases reasoned through (seed/switch/manual-cancel/dirty-guard).

This was the **last open P1**. Backlog now P2/P3 only.

## Why
[StudyPage.tsx](../../../frontend/src/pages/StudyPage.tsx) holds answers in local
state and only persists on explicit Save. The product depends on long, rambling
written answers (the highest-signal input) — but clicking the nav, Previous, or
closing the tab silently discards unsaved edits. The save endpoint takes the full
question set with blanks = skipped, so partial debounced saves are safe + lossless.

## Scope (the change) — frontend only, two additive layers
1. **Debounced autosave.** Factor a `persist()` (the `api.saveStudy` call, no
   navigate/toast). A `useEffect` keyed on `answers` schedules a ~1500ms save,
   guarded against firing on the initial seed by comparing to a baseline ref
   captured at load. Subtle `idle | saving | saved` status near the Meter (not a
   toast). Update the baseline + status after each successful save.
2. **`beforeunload` guard** when dirty (covers tab-close; router-agnostic).

## Decisions (from the grilled todo)
- **Skip `useBlocker`** — app uses `BrowserRouter` + declarative `<Routes>`;
  v7 `useBlocker` needs a data router. Debounced autosave makes in-app nav loss a
  non-issue anyway.
- Reset timer + baseline when `studyId` changes; manual save clears any pending
  timer and refreshes the baseline. Backend is upsert-per-question
  (last-write-wins), so overlapping saves are safe.
- Keep the existing manual Save buttons (they still toast + navigate); autosave
  status is tracked separately so background saves don't flicker the buttons.

## Verify
- `npm run typecheck:web` + `npm run build` clean.
- Reason through: edit → ~1.5s later status flips saving→saved; switching study
  doesn't autosave the seed; manual Save cancels a pending autosave; dirty +
  tab-close prompts; clean state does not prompt.

## Refs
code: [StudyPage.tsx](../../../frontend/src/pages/StudyPage.tsx), [client.ts](../../../frontend/src/api/client.ts) · corpus: [genai-openended-scoring-2025](../../wiki/sources/genai-openended-scoring-2025.md)
