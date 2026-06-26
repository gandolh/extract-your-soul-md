# Multi-platform import adapter registry — SHIPPED (redirected)

> **SHIPPED 2026-06-26 as [brief 40](../briefs/done/40-stats-multi-format-adapters.md) — REDIRECTED.**
> This todo was **stale**: the soul-pipeline WhatsApp parser it targeted
> (`parseLine`/BRACKETED/DASHED in `process.ts`) was REMOVED when the
> conversation-import feature was deleted — `process.ts` is now
> questionnaire-only. Per explicit user decision the adapter registry was built in
> the **conversation-statistics feature** (`src/stats/conversation-stats.ts`)
> instead, where the only live multi-format chat parser actually lives. The
> soul-pipeline import path stays removed/locked. Telegram-JSON shipped as the
> second adapter; iMessage/Discord/Signal/CSV remain deferred behind the same
> seam. The (now-obsolete) problem statement below is kept for history.

**Priority:** P3 · **Goal:** engineering · **Impact:** medium · **Effort:** L · **Status:** done (brief 40, redirected) · **Captured:** 2026-06-16 · **Updated:** 2026-06-26 (shipped, redirected to the stats feature)

## Status
The **S half (zero-recognized-lines guard) shipped as
[brief 36](../briefs/done/36-zero-recognized-lines-guard.md)** — a non-WhatsApp
upload now fails loudly via `NoRecognizedMessagesError` instead of producing an
empty soul.md. This todo now tracks **only the deferred L half**: the parser
adapter registry.

## Problem (remaining)
Ingestion is WhatsApp-only: `parseLine` recognizes exactly two line formats
([process.ts:20-21](../../src/stages/process.ts#L20-L21)). Other exports
(iMessage, Telegram/Discord JSON, Signal, CSV) are now rejected with a clear
error (brief 36), but still cannot be imported at all.

## Decision / approach (DEFERRED)
- Extract `BRACKETED`/`DASHED` into a `whatsapp` adapter that normalizes to
  `ParsedLine {sender, body}`, then add a second adapter (Telegram JSON is the
  obvious first candidate).
- **Gated on a real second-format request.** `decisions.md` locks "WhatsApp-only";
  flipping it requires a revisit + a `log.md` note, and there's no demand signal
  yet.
- Keep the `ParsedLine` seam stable — the server's `processAll` consumes it.

## Refs
code: [process.ts](../../src/stages/process.ts), [pipeline.ts](../../src/server/pipeline.ts) · corpus: [decisions.md](../wiki/decisions.md), [briefs/done/36](../briefs/done/36-zero-recognized-lines-guard.md)
