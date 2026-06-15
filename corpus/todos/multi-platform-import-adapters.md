# Multi-platform import adapter layer + zero-lines guard — MOSTLY DEFERRED

**Priority:** P3 · **Goal:** engineering · **Impact:** medium · **Effort:** L (adapters) / S (guard) · **Status:** todo · **Captured:** 2026-06-16

## Problem
Ingestion is WhatsApp-only: `parseLine` recognizes exactly two line formats
([process.ts:20-21,121-125](../../src/stages/process.ts#L20-L21)); any other export
(iMessage, Telegram/Discord JSON, Signal, CSV) silently produces zero kept lines.
Also, `processAll` increments `filesProcessed` even when a file yields zero kept
lines, so a non-WhatsApp upload silently produces an empty soul.md.

## Decision / approach (audit-refined — fix the papercut now, defer the registry)
- **Now (S):** add a zero-lines guard in `processAll`
  ([process.ts:212-221](../../src/stages/process.ts#L212-L221)) —
  `linesOut === 0 && questionnaireAnswers === 0` → throw "no recognized messages
  — is this a WhatsApp export?". (Coordinate with the web-layer assertion in
  [name-normalization-import-validation](name-normalization-import-validation.md)
  so the shared core doesn't break questionnaire-only runs.)
- **Deferred (L):** the parser-adapter registry (extract BRACKETED/DASHED into a
  `whatsapp` adapter normalizing to `ParsedLine {sender, body}`, then add Telegram
  JSON). `decisions.md` locks "WhatsApp-only" — flipping it needs a revisit + a
  `log.md` note, and there's no demand signal yet. Gate on a real second-format
  request. Keep the `ParsedLine` seam stable (both CLI + web use `processAll`).

## First step
Add the zero-recognized-lines guard at the web layer / pipeline (not the shared
core path that questionnaire-only flows use).

## Refs
code: [process.ts](../../src/stages/process.ts), [pipeline.ts](../../src/server/pipeline.ts), [conversations.ts](../../src/server/routes/conversations.ts) · corpus: [decisions.md](../wiki/decisions.md)
