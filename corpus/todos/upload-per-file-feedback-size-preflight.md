# Per-file upload feedback + client-side 5 MB size preflight

**Priority:** P2 · **Goal:** ease-of-use · **Impact:** medium · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
[ImportPage.tsx](../../frontend/src/pages/ImportPage.tsx) `uploadFiles` loops
awaiting each `addConversation` inside one try/catch — a single failure mid-batch
aborts the rest, leaving partial state and one generic toast. No per-file
progress and no client-side size check, so an oversized export only fails after
the full upload, with the server's 413 ("File too large (5 MB max).") surfacing
late. (The 413 text does already show — the real gaps are batch-resilience and
pre-upload feedback.)

## Decision / approach (audit-refined — contained to one function)
- Define `const MAX_BYTES = 5 * 1024 * 1024;` (matches
  [conversations.ts:12](../../src/server/routes/conversations.ts#L12)). Partition
  the filtered list into oversized (`f.size > MAX_BYTES`) vs ok; report oversized
  by name with split guidance. (`f.size` is a sound proxy for the server's UTF-8
  byte length.)
- Per-file try/catch inside the loop — one failure never breaks the batch; collect
  results and show a summary ("Imported 3, skipped 1 (too large)").
- Optional inline per-file status rows (queued/uploading/done/failed/skipped) — if
  added, match the mono/oxblood design-brief aesthetic.
- Server stays the source of truth for the cap (defense in depth).

## First step
In `uploadFiles`, add `MAX_BYTES` + partition the list before the upload loop.

## Refs
code: [ImportPage.tsx](../../frontend/src/pages/ImportPage.tsx), [conversations.ts](../../src/server/routes/conversations.ts) · corpus: [stitch-design-brief](../wiki/sources-raw/stitch-design-brief.md)
