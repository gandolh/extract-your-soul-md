# Fix the silent names mismatch: normalize names + zero-match assertion + format sniff

**Priority:** P1 · **Goal:** accuracy · **Impact:** high · **Effort:** M · **Status:** done (→ [briefs/done/07](../briefs/done/07-name-normalization-import-validation.md), 2026-06-16) · **Captured:** 2026-06-16

## Problem
The "your messages only" filter is the load-bearing voice filter
([architecture.md](../wiki/architecture.md)), but matching is exact and
case-sensitive: `myNames.has(parsed.sender)`
([process.ts:184](../../src/stages/process.ts#L184)), sender only trimmed
([process.ts:124](../../src/stages/process.ts#L124)). A wrong/mis-cased name, a
WhatsApp `~` group prefix, or a stray Unicode bidi mark → **zero matched
messages → a thin/empty soul.md with no warning**. The "No inputs found" guard
only fires when NO file produced output, so a names mismatch sails through.
Names aren't seeded by default, so this is the common first-run failure.

## Decision / approach (settled by audit, confirmed 2026-06-16)
- **Normalize, then exact-match (no fuzzy/substring** — that risks false
  self-matches). Add `export function normalizeName(s)` to
  [process.ts](../../src/stages/process.ts): trim → strip leading `~` → strip
  bidi/zero-width marks (LRM/RLM, U+200B–200F) → NFC → toLowerCase. Apply it both
  when building the `myNames` Set ([pipeline.ts:79](../../src/server/pipeline.ts#L79))
  and at the compare site ([process.ts:184](../../src/stages/process.ts#L184)).
- **Zero-match assertion in the web layer, not the shared core** (throwing from
  `processAll` would break questionnaire-only / partial runs). In
  [pipeline.ts](../../src/server/pipeline.ts), after `processAll`, if a file
  parsed >0 lines but matched 0 of `myNames`, surface an actionable error listing
  the distinct senders seen. Extend `ProcessStats` with per-source
  `{filename, parsedSenders, myLinesIn, linesOut}`.
- **Format sniff** in [conversations.ts](../../src/server/routes/conversations.ts):
  sample the first ~50 non-empty lines against the BRACKETED/DASHED regexes
  (export them from process.ts to avoid drift); return **422** if none match.

## First step
Add `normalizeName()` to [process.ts](../../src/stages/process.ts) and apply it
at the Set-construction and compare sites. Ship this slice alone first — cheapest
fix, biggest correctness payoff.

## Dependencies & sequencing
Complements [import-sender-detection-diagnostics](import-sender-detection-diagnostics.md)
(the UI that shows detected senders + matched counts so the user can fix their
list). Do normalization first; the diagnostics surface it.

## Refs
code: [process.ts](../../src/stages/process.ts), [pipeline.ts](../../src/server/pipeline.ts), [conversations.ts](../../src/server/routes/conversations.ts) · corpus: [architecture.md](../wiki/architecture.md), [overview.md](../wiki/overview.md)
