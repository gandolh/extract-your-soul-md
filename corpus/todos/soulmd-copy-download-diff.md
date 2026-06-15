# Copy / Download for soul.md + re-run diff on ResultsPage

**Priority:** P2 · **Goal:** ease-of-use · **Impact:** medium · **Effort:** M · **Status:** todo · **Captured:** 2026-06-16

## Problem
CLAUDE.md positions soul.md as "the only artifact other tools depend on" and
"meant for manual review", yet [ResultsPage.tsx](../../frontend/src/pages/ResultsPage.tsx)
renders it read-only with no Copy and no Download — the only way out is manual
text selection. On re-run, "View previous" is a binary swap with no diff, so users
can't see how adding material moved the profile.

## Decision / approach (audit-refined — two phases)
- **Phase 1 (the real win, S):** add Copy
  (`navigator.clipboard.writeText(result.soulMd)` + toast) and Download
  (`Blob` + anchor `download="soul.md"`) into the header action row. Zero new deps.
- **Phase 2 (M, follow-up):** replace the binary View/Hide-previous swap with a
  hand-rolled line-level diff of `soulMd` vs `prevMd` (both already on
  `SoulResult`). No diff lib — the input is small structured markdown; render
  added/removed lines via new `.soul`-scoped CSS in a separate render path (the
  custom [Markdown.tsx](../../frontend/src/components/Markdown.tsx) can't show diff
  markers). Reinforces the "re-run as you add material" loop.
- Optional: a small "review before sharing" hint near Download (privacy framing).

## First step
Add the Copy button to the [ResultsPage.tsx](../../frontend/src/pages/ResultsPage.tsx)
header row (Phase 1).

## Refs
code: [ResultsPage.tsx](../../frontend/src/pages/ResultsPage.tsx), [client.ts](../../frontend/src/api/client.ts), [Markdown.tsx](../../frontend/src/components/Markdown.tsx) · corpus: [regurgitation-risk](../wiki/concepts/regurgitation-risk.md)
