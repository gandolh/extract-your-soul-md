# 21 — Copy / Download for soul.md (Phase 1)

**Priority:** P2 · **Goal:** ease-of-use · **Impact:** medium · **Effort:** S · **Status:** done · **Promoted:** 2026-06-16 (from `todos/soulmd-copy-download-diff.md`) · **Done:** 2026-06-16

## Problem
soul.md is "the only artifact other tools depend on" and "meant for manual
review", yet ResultsPage rendered it read-only — no Copy, no Download; the only
way out was manual text selection.

## Outcome (2026-06-16) — Phase 1 only
- ResultsPage: **Copy** (`navigator.clipboard.writeText`) + **Download** (`Blob` +
  anchor `download="soul.md"`) buttons in the header action row (shown when a
  result exists). Both act on `shownMd` — the currently-displayed version, so
  Download/Copy respect the "View previous" toggle. Plus a "Review before sharing
  — soul.md is built from your private words." hint (privacy framing). Zero new deps.
- **Phase 2 (line-level re-run diff) deferred** — separate M-effort follow-up;
  remains as a note in the source todo's history, not carried as a live todo.

Verified in-browser (Playwright, prod build): Copy + Download buttons + review
hint render on a seeded result; Copy click fires without error. Both typechecks +
build clean. Test user cleaned, DB left as found. Nothing committed.

## Refs
code: [ResultsPage.tsx](../../../frontend/src/pages/ResultsPage.tsx) · corpus: [regurgitation-risk](../../wiki/concepts/regurgitation-risk.md)

## Deferred follow-up (Phase 2)
Hand-rolled line-level diff of `soulMd` vs `prevMd` (both on `SoulResult`) to
replace the binary View/Hide-previous swap. No diff lib; new `.soul`-scoped diff
render path. Reinforces the "re-run as you add material" loop.
