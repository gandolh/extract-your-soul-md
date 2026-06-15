# Persist the EN/RO language choice globally

**Priority:** P3 · **Goal:** ease-of-use · **Impact:** low · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
The EN/RO `lang` toggle is local component state defaulting to `'en'`
([StudyPage.tsx:15](../../frontend/src/pages/StudyPage.tsx#L15)), so it resets on
every study and reload — a Romanian-primary user re-toggles on each of the three
studies. This also inverts the documented Romanian-primary default
([02-questionnaire-design](../wiki/sources-raw/02-questionnaire-design.md), CLI
`--en`).

## Decision / approach (audit-refined — language half only)
- Replace the local `useState` with a `useLangPref()` hook backed by
  `localStorage` (key `soul.lang`) in a new `frontend/src/lang.ts`. Decide the
  default explicitly — `'ro'` honors the documented default. A full React context
  is overkill for one boolean.
- **Dropped:** the "dedicated Skip control" half — an explicit skip produces a
  byte-identical result to a blank field ([process.ts](../../src/stages/process.ts)
  filters both), so it has zero behavioral effect. If reassurance is wanted, just
  reword the non-optional placeholder ("Leave blank to skip — partial answers are
  fine.").

## First step
Create `frontend/src/lang.ts` with `useLangPref()`; swap
[StudyPage.tsx:15](../../frontend/src/pages/StudyPage.tsx#L15) to use it.

## Refs
code: [StudyPage.tsx](../../frontend/src/pages/StudyPage.tsx), [index.ts](../../src/index.ts) (`--en`) · corpus: [02-questionnaire-design](../wiki/sources-raw/02-questionnaire-design.md)
