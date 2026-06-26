# 40 — Multi-format adapters for the conversation-statistics parser

**Priority:** P3 · **Goal:** engineering · **Impact:** medium · **Effort:** M · **Status:** done · **Promoted:** 2026-06-26 (from `todos/multi-platform-import-adapters.md` — REDIRECTED: the soul-pipeline WhatsApp parser the old todo targeted was removed; per explicit user decision this work lands in the conversation-statistics feature ONLY) · **Done:** 2026-06-26

## Outcome (2026-06-26)
Shipped in the conversation-statistics feature **only** — the soul pipeline stays
questionnaire-only. Built by a sub-agent in an isolated worktree, integrated to
main.
- `parseConversation` refactored into a `ChatAdapter { name, detect, parse }`
  registry in `src/stats/conversation-stats.ts`. The existing WhatsApp/iOS text
  logic is wrapped UNCHANGED as the `whatsapp` adapter (detect = ≥1 line matches
  BRACKET_RE/DASH_RE with a `Sender: ` separator). New `telegram-json` adapter
  parses Telegram Desktop JSON exports (date from ISO string, sender from `from`,
  entity-array `text` flattened, `type:'service'` entries skipped). Adapters tried
  in order (whatsapp first); none match → `[]`.
- `ParsedMessage`, `analyzeConversation`, `ConversationStats`, and
  `src/shared/stats-types.ts` all unchanged — the seam normalizes to
  `ParsedMessage`. Privacy boundary intact (still transient, no transcript
  stored).
- `frontend/src/pages/StatsPage.tsx`: copy broadened to mention Telegram JSON;
  file input accepts `.txt,.json`.
- **Tests:** 11 new cases in `conversation-stats.test.ts` (adapter selection +
  Telegram-JSON counts/dates/service-skip/entity-flatten/full-stats). All 50
  pre-existing WhatsApp/iOS golden tests pass UNCHANGED (regression gate).
  typecheck:web + typecheck:test + lint clean.

## Critical context — the original todo was stale
The old todo targeted `parseLine` / `BRACKETED` / `DASHED` in
[stages/process.ts](../../../src/stages/process.ts). **That parser no longer
exists** — `process.ts` is now questionnaire-only (`## Qn — Title` sections). The
only live multi-format chat parser in the codebase is `parseConversation` in
[stats/conversation-stats.ts](../../../src/stats/conversation-stats.ts), part of
the **standalone, no-LLM conversation-statistics feature** (Analyze + Saved
pages). **This brief touches that feature ONLY. It does NOT re-introduce chat
import into the soul pipeline** — that architectural decision (questionnaire is
the sole extraction input) stays locked.

## Decision (grilled 2026-06-26): "Just the stats parser"
Add a small adapter registry inside the conversation-stats module so users can
paste/upload non-WhatsApp exports on the Analyze page. **Telegram is the first
new adapter.** Keep the privacy boundary absolute — still transient, still no
transcript stored.

## Approach
1. **[conversation-stats.ts](../../../src/stats/conversation-stats.ts)** —
   refactor `parseConversation` into an adapter registry:
   - Define `interface ChatAdapter { name: string; detect(input: string):
     boolean; parse(input: string): ParsedMessage[] }`.
   - Wrap the EXISTING WhatsApp/iOS text logic (BRACKET_RE / DASH_RE + file-wide
     day/month-order resolution + media-placeholder skip) unchanged as the
     `whatsapp` adapter. `detect` = "≥1 line matches BRACKET_RE or DASH_RE with a
     `Sender: ` separator". Behavior for existing inputs must be byte-identical —
     the golden tests in
     [conversation-stats.test.ts](../../../src/stats/conversation-stats.test.ts)
     must still pass unchanged.
   - Add a `telegram-json` adapter: Telegram Desktop "Export chat history → JSON"
     produces `{ name, type, messages: [{ id, type:'message', date:
     '2024-01-12T10:00:00', from: 'X', text: string | (string|{type,text})[],
     ... }] }`. `detect` = valid JSON with a `messages` array whose entries have
     `date` + `from`/`from_id`. `parse` → `ParsedMessage[]`: `date` from ISO
     string (null if unparseable), `sender` from `from`, `content` = `text`
     flattened (when `text` is an entity array, concatenate the `.text`/string
     parts). Skip `type:'service'` entries (joins, pins) — they're system notices,
     like the timestamped-system-line skip in the WhatsApp path.
   - `parseConversation(input)` becomes: try each adapter's `detect` in order
     (whatsapp first to preserve current precedence), use the first match's
     `parse`; if none detect, return `[]` (current behavior on garbage input — the
     route already handles an empty parse).
   - Keep `ParsedMessage` and the downstream `analyzeConversation` aggregation
     UNCHANGED — the adapter seam normalizes to `ParsedMessage`, nothing below it
     changes.
2. **frontend (optional, light)** — if `StatsPage` copy says "WhatsApp export",
   broaden it to mention Telegram JSON too. Don't redesign; one-line copy + maybe
   accept `.json` in the file input. Verify with `typecheck:web`.

## Testing
- Extend [conversation-stats.test.ts](../../../src/stats/conversation-stats.test.ts):
  - existing WhatsApp/iOS golden tests pass unchanged (regression gate);
  - new Telegram-JSON fixture → correct per-sender message counts, dates parsed,
    `service` entries skipped, entity-array `text` flattened;
  - adapter selection: a WhatsApp text blob still routes to `whatsapp`; a JSON
    blob routes to `telegram-json`; unrecognized input → `[]`.
- `npm test` + `typecheck:test` + `typecheck:web` clean.

## Out of scope (still deferred)
iMessage, Discord, Signal, generic CSV adapters — add later on demand behind the
same seam. The soul-pipeline import path stays removed/locked.

## Refs
code: [stats/conversation-stats.ts](../../../src/stats/conversation-stats.ts), [stats/conversation-stats.test.ts](../../../src/stats/conversation-stats.test.ts), `frontend/src/` StatsPage · corpus: [36-zero-recognized-lines-guard](../done/36-zero-recognized-lines-guard.md), [decisions.md](../../wiki/decisions.md)
