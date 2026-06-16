# Brief 11 — Import diagnostics: detected senders, match counts, "add" chips

**Promoted from:** [todos/import-sender-detection-diagnostics.md](../../todos/import-sender-detection-diagnostics.md)
**Priority:** P1 · **Goal:** ease-of-use · **Impact:** high · **Effort:** M · **Captured:** 2026-06-16 · **Promoted:** 2026-06-16 · **Done:** 2026-06-16

## Outcome (2026-06-16)
Implemented as specced.
- **Backend:** `detectSenders(content)` + `DetectedSender` exported from
  [process.ts](../../../src/stages/process.ts) — groups by `normalizeName()`,
  labels each group with its most-frequent raw spelling, sums counts. New
  `GET /api/conversations/senders` in
  [conversations.ts](../../../src/server/routes/conversations.ts) merges
  detections across the user's conversations (names-independent, no Ollama).
  Live-tested: `Cristian`/`~Cristian`/`CRISTIAN` → one sender, count 4; `Maria`
  separate. Sorted by count desc.
- **Frontend:** `api.senders()` + type; new
  [frontend/src/lib/normalizeName.ts](../../../frontend/src/lib/normalizeName.ts)
  mirroring the backend (verified identical on all cases — there's a KEEP IN SYNC
  note). [ImportPage.tsx](../../../frontend/src/pages/ImportPage.tsx) Step 1 now
  renders detected-sender chips with counts; clicking appends the raw name to the
  textarea (skipped if its normalized form is already present); a live "matched N
  of M messages" line and a loud zero-match warning ("no freeform voice signal …
  questionnaire answers still count") derive from the draft textarea, updating as
  you click chips before saving.

Verified: `npm run build` + `npm run typecheck:web` clean; `/senders` grouping
live-tested; frontend↔backend `normalizeName` confirmed identical. This completes
the import-correctness story with brief 07 (07 fails loudly at extract time; 11
makes the mismatch visible + fixable at import time). Out of scope per todo: date
ranges, stashing `myLinesIn` into `results` (optional later).

## Why
The names step is a silent footgun: ImportPage shows it as a skippable "Step 1"
with no validation, and the dropzone only reports "Imported N files". A user can
import chats, set wrong/no names, and extract from zero freeform signal. Brief 07
makes the mismatch fail loudly at *extract* time; this makes it visible and
fixable *before* extraction. The UI completion of 07.

## Design decisions (grilled 2026-06-16)
- **Group senders by `normalizeName()`** (the form the filter matches on), but
  display the most common raw spelling as the label and paste that exact raw
  string when a chip is clicked. One row per real person, matches how filtering
  works.
- **Chips paste the raw display name** (readable; normalization handles the
  match). A chip whose normalized name is already in the saved names is shown as
  already-added (disabled/checked).
- **Match count is client-side**: the `/senders` response carries per-sender
  counts; the page sums counts whose normalized name ∈ saved names. Updates
  instantly as chips are added — no extra endpoint, no Ollama.

## Scope (the change)
### Backend
- Export `detectSenders(content: string)` from
  [process.ts](../../../src/stages/process.ts) reusing the private `parseLine`:
  returns `Array<{ name: string; normalized: string; count: number }>` where
  `name` is the most frequent raw spelling per normalized key, `count` is the
  total across variants. Names-independent — works before names are set.
- `GET /api/conversations/senders` in
  [conversations.ts](../../../src/server/routes/conversations.ts): aggregate
  `detectSenders` over `getConversationContents(userId)` (merge counts across
  files), return `{ senders: [...] }` sorted by count desc. Do NOT run
  `processAll`/mkdtemp — detection is cheap and names-independent.

### Frontend ([ImportPage.tsx](../../../frontend/src/pages/ImportPage.tsx))
- `api.senders()` client method + `DetectedSender` type.
- Fetch senders on load and after each upload. Under Step 1, render the detected
  senders with counts + one-click "add" chips appending the raw name to
  `namesText` (skip if its normalized form is already present). Reuse the
  frontend mirror of `normalizeName` (small local helper — keep in sync, or a
  shared note) for the "already added" check and the live match sum.
- Show "✓ matched N of your messages" (sum of counts whose normalized name is in
  the saved names) and a loud warning card when conversations exist but names
  match **zero** detected senders. Warning copy: "No freeform voice signal from
  these chats — your questionnaire answers still count." (NOT "profile will be
  empty" — answers are voice signal too.)

## Out of scope
- Date ranges in diagnostics (todo mentioned them as nice-to-have; counts +
  senders are the load-bearing part).
- Stashing `myLinesIn` into `results` for a post-extraction line (optional
  follow-up in the todo — separate, later).

## Verify
- `npm run build` + `npm run typecheck:web` clean.
- `GET /api/conversations/senders` returns grouped senders w/ counts; live-test
  with a 2-sender export (mixed casing/`~`) → one row per person.
- Reason through: empty names + imported chat → zero-match warning shows; adding
  the chip clears it and the match count jumps.

## Refs
code: [process.ts](../../../src/stages/process.ts), [server/routes/conversations.ts](../../../src/server/routes/conversations.ts), [frontend/src/pages/ImportPage.tsx](../../../frontend/src/pages/ImportPage.tsx), [frontend/src/api/client.ts](../../../frontend/src/api/client.ts) · context: [briefs/done/07](../done/07-name-normalization-import-validation.md)
