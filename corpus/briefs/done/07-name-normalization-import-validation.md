# Brief 07 — Fix the silent names mismatch (normalize + zero-match assertion + format sniff)

**Promoted from:** [todos/name-normalization-import-validation.md](../../todos/name-normalization-import-validation.md)
**Priority:** P1 · **Goal:** accuracy · **Impact:** high · **Effort:** M · **Captured:** 2026-06-16 · **Promoted:** 2026-06-16 · **Done:** 2026-06-16

## Outcome (2026-06-16)
All three slices implemented.
- **Slice 1:** `normalizeName()` exported from
  [process.ts](../../../src/stages/process.ts) (trim → strip leading `~` →
  strip zero-width/bidi marks U+200B–200F + U+FEFF → NFC → toLowerCase).
  Applied caller-proof: `processAll` normalizes the incoming `myNames` Set once
  and normalizes each parsed sender at the compare site. Runtime-verified
  `~ Cristian<LRM>` / `CRISTIAN` / `  Cristian  ` all → `cristian`.
- **Slice 2:** `ProcessStats` gained `perSource: SourceStats[]`
  (`{filename, parsedSenders, myLinesIn, linesOut}`). New `NamesMismatchError` in
  [pipeline.ts](../../../src/server/pipeline.ts); `runUserExtraction` throws it
  (with the distinct senders seen, capped 20) when conversations parsed lines but
  matched 0 names globally — so a names typo fails loudly instead of yielding an
  empty soul.md. Wired to a 400 in
  [results.ts](../../../src/server/routes/results.ts). Questionnaire-only and
  partial-match runs pass through untouched.
- **Slice 3:** `BRACKETED`/`DASHED` exported from process.ts (no duplication) +
  `looksLikeWhatsAppExport()`; the conversations POST returns **422** when an
  upload doesn't look like a WhatsApp export. Live-tested: non-WhatsApp → 422,
  real export → 201.

`npm run build` + `npm run typecheck:web` clean. Sequences before
[import-sender-detection-diagnostics](../../todos/import-sender-detection-diagnostics.md),
which will surface `perSource` in the UI so users can self-correct before
extraction (rather than only seeing the error at extract time).

## Why
The "your messages only" filter is the load-bearing voice filter, but matching is
exact + case-sensitive (`myNames.has(parsed.sender)`,
[process.ts:184](../../../src/stages/process.ts#L184); sender only trimmed at
[process.ts:124](../../../src/stages/process.ts#L124)). A mis-cased name, a
WhatsApp `~` group prefix, or a stray Unicode bidi mark → **zero matches → a
thin/empty soul.md with no warning**. The "No inputs found" guard only fires when
NO file produced output, so a names mismatch sails through silently. Names aren't
seeded by default → this is the common first-run failure.

## Scope (3 slices, ship in order)
### Slice 1 — normalize, then exact-match (the cheap, high-payoff fix)
- Add `export function normalizeName(s: string): string` to
  [process.ts](../../../src/stages/process.ts): trim → strip leading `~` → strip
  bidi/zero-width marks (LRM/RLM U+200E/200F, U+200B–200D, U+FEFF) → NFC →
  toLowerCase.
- Apply at BOTH sites: building the `myNames` Set in
  [pipeline.ts](../../../src/server/pipeline.ts) (`new Set(getNames(userId).map(normalizeName))`)
  and the compare in `processAll` (`myNames.has(normalizeName(parsed.sender))`).
- **No fuzzy/substring** — that risks false self-matches.

### Slice 2 — zero-match assertion in the web layer (not the shared core)
- Throwing from `processAll` would break questionnaire-only / partial runs, so the
  assertion lives in [pipeline.ts](../../../src/server/pipeline.ts) after `processAll`.
- Extend `ProcessStats` with `perSource: Array<{filename, parsedSenders: string[],
  myLinesIn, linesOut}>` (distinct senders seen per file).
- In pipeline: if any source parsed >0 lines but matched 0 of `myNames`, throw an
  actionable error listing the distinct senders seen (so the user can fix their
  names list). Reuse a typed error like extraction's `NothingToExtractError`.

### Slice 3 — format sniff at upload
- In [conversations.ts](../../../src/server/routes/conversations.ts) POST, sample
  the first ~50 non-empty lines against the WhatsApp regexes. Export `BRACKETED`
  and `DASHED` from process.ts (don't duplicate — avoid drift). If none match,
  return **422** with a "doesn't look like a WhatsApp export" message.

## Out of scope (locked)
- Fuzzy matching of any kind.
- The detected-senders UI (separate todo
  [import-sender-detection-diagnostics](../../todos/import-sender-detection-diagnostics.md)) —
  this brief surfaces the data via errors; that brief builds the UI.

## Verify
- `npm run build` + `npm run typecheck:web` clean.
- `normalizeName('~ Cristian‎')` === `normalizeName('cristian')` reasoning check.
- Uploading a non-WhatsApp file → 422; a real export → 201.
- Reason through: a names-mismatch extraction now throws with the sender list
  instead of producing an empty soul.md.

## Refs
code: [process.ts](../../../src/stages/process.ts), [server/pipeline.ts](../../../src/server/pipeline.ts), [server/routes/conversations.ts](../../../src/server/routes/conversations.ts) · corpus: [architecture.md](../../wiki/architecture.md), [overview.md](../../wiki/overview.md)
