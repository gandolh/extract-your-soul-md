# 22 — Per-file upload feedback + client-side 5 MB size preflight

**Priority:** P2 · **Goal:** ease-of-use · **Impact:** medium · **Effort:** S · **Status:** done · **Promoted:** 2026-06-16 (from `todos/upload-per-file-feedback-size-preflight.md`) · **Done:** 2026-06-16

## Problem
ImportPage `uploadFiles` looped awaiting each `addConversation` inside ONE
try/catch — a single mid-batch failure aborted the rest, leaving partial state and
one generic toast. No client-side size check, so an oversized export only failed
after the full upload.

## Outcome (2026-06-16)
- `MAX_BYTES = 5 * 1024 * 1024` (mirrors the server's `MAX_CONTENT_BYTES`,
  verified — server uses `Buffer.byteLength(content,'utf8')`; `f.size` is a sound
  UTF-8 proxy). Server stays authoritative (413) — client check is UX-only.
- `uploadFiles` partitions into oversized (skipped, reported by name with split
  guidance) vs ok; **per-file try/catch inside the loop** so one failure never
  aborts the batch; collects `imported`/`failed` and shows a summary toast
  ("Imported 3, skipped 1 over 5 MB, …"). Reloads only if ≥1 imported.

Verified: backend cap confirmed at 5 MB; both typechecks + build clean. (Logic is
contained to one function; the batch-resilience + partition is straightforward.)
Nothing committed.

## Refs
code: [ImportPage.tsx](../../../frontend/src/pages/ImportPage.tsx), [conversations.ts](../../../src/server/routes/conversations.ts)
