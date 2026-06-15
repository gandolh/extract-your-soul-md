# Import diagnostics: detected senders, matched-message counts, "add this name" chips

**Priority:** P1 · **Goal:** ease-of-use · **Impact:** high · **Effort:** M · **Status:** todo · **Captured:** 2026-06-16

## Problem
The names step is a silent footgun. [ImportPage.tsx](../../frontend/src/pages/ImportPage.tsx)
presents names as an easy-to-skip "Step 1" with no validation, and the dropzone
only ever reports "Imported N files" — never message counts, date ranges, or
detected speakers. A user can import chats, set wrong/no names, extract, and get
a soul.md built from zero freeform signal with no warning. `ProcessStats` already
tracks `myLinesIn/linesOut/duplicatesDropped` but nothing surfaces it on the web.

## Decision / approach (audit-refined)
- **Backend:** export a `detectSenders(content)` helper from
  [process.ts](../../src/stages/process.ts) reusing the private `parseLine`; add
  `GET /api/conversations/senders` in
  [conversations.ts](../../src/server/routes/conversations.ts) that aggregates
  over `getConversationContents(userId)` and returns
  `{ senders: [{ name, count, files }] }`. Do **not** re-run the full
  `processAll`/mkdtemp machinery — sender detection is names-independent and must
  work BEFORE names are set (so the chips can populate an empty field).
- **Frontend:** fetch on load; render a detected-senders list with counts under
  Step 1 + one-click "add" chips that append the exact string to `namesText`;
  compute "matched N of your messages"; show a loud warning card when names match
  zero detected senders while conversations exist.
- Warning copy: "no freeform voice signal from these chats" — NOT "your profile
  will be empty" (questionnaire answers are also voice signal —
  [dual-use-signal](../wiki/concepts/dual-use-signal.md)).
- Optional follow-up: stash `myLinesIn/linesOut` from
  [pipeline.ts:80](../../src/server/pipeline.ts#L80) into `results` for a
  post-extraction "built from N of your messages" line.

## First step
Export `detectSenders()` from [process.ts](../../src/stages/process.ts), then add
`GET /api/conversations/senders`.

## Dependencies & sequencing
Pairs with [name-normalization-import-validation](name-normalization-import-validation.md)
— normalize matching first; this is the UI that makes the mismatch visible and
fixable. Chips paste exact strings, which matters since matching is exact.

## Refs
code: [process.ts](../../src/stages/process.ts), [conversations.ts](../../src/server/routes/conversations.ts), [ImportPage.tsx](../../frontend/src/pages/ImportPage.tsx) · corpus: [architecture.md](../wiki/architecture.md)
