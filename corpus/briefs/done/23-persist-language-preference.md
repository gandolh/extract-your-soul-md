# 23 — Persist the EN/RO language choice (default RO)

**Priority:** P3 · **Goal:** ease-of-use · **Impact:** low · **Effort:** S · **Status:** done · **Promoted:** 2026-06-16 (from `todos/persist-language-preference.md`) · **Done:** 2026-06-16

## Problem
The EN/RO `lang` toggle was local `useState` defaulting to `'en'`, so it reset on
every study + reload, and inverted the documented Romanian-primary default.

## Outcome (2026-06-16)
- New `frontend/src/lang.ts` exporting `useLangPref()` — localStorage-backed
  (key `soul.lang`), **default `'ro'`** (honors the questionnaire-design default),
  try/catch around storage (private-mode safe). No React context (overkill for one
  boolean).
- StudyPage swaps `useState<'en'|'ro'>('en')` → `useLangPref()`.
- **Dropped** the "dedicated Skip control" half per the audit — an explicit skip is
  byte-identical to a blank field (`process.ts` filters both).

Verified in-browser: a fresh login renders Study prompts in **Romanian** (default
live); typecheck + build clean. Nothing committed.

## Refs
code: [lang.ts](../../../frontend/src/lang.ts), [StudyPage.tsx](../../../frontend/src/pages/StudyPage.tsx) · corpus: [02-questionnaire-design](../../wiki/sources-raw/02-questionnaire-design.md)
