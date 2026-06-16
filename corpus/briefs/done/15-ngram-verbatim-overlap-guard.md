# 15 — Synthesis-time n-gram verbatim-overlap guard

**Priority:** P3 · **Goal:** accuracy (privacy) · **Impact:** low · **Effort:** M · **Status:** done · **Promoted:** 2026-06-16 (from `todos/ngram-verbatim-overlap-guard.md`) · **Done:** 2026-06-16

## Problem
Anti-regurgitation was a single soft instruction repeated 3× in
[prompts.ts](../../../src/prompts.ts) with zero enforcement. A small model can leak
input spans verbatim despite it. The research calls verbatim-prevention
necessary-but-not-sufficient ([privacy-not-just-memorization](../../wiki/sources/privacy-not-just-memorization.md))
— and style alone re-identifies 79.2%
([deanonymization-2026](../../wiki/sources/deanonymization-2026.md)), so this does
NOT replace the real safety net (gitignore + manual review).

## Decision / approach (audit-refined — n-gram only, drop NER; log-only on hit)
- New pure module [src/regurgitation.ts](../../../src/regurgitation.ts):
  `findVerbatimOverlap(generated, source, ngram=7)` shingles both texts (lowercase,
  punctuation-stripped, NFC, whitespace-tokenized) and returns shingles present in
  both. Language-agnostic (RO / code-switch), deterministic, no dependency.
- Wired into `runOllamaPipeline` ([extract.ts](../../../src/stages/extract.ts)) after
  the reduce, before `writeFileSync`. Source = the raw chunk files minus the
  questionnaire `#`-comment scaffolding (our text, not the user's).
- **On hit: LOG + WARN, write soul.md unchanged** (grilled 2026-06-16). Stripping
  risks mangling the profile mid-sentence and isn't the real safety net; the
  manual-review gate acts on the warning. n=7 is long enough that the
  intentionally-preserved short catchphrases (1-3 words) don't trip it.
- **Dropped entity-NER redaction** — multilingual NER is L-effort, error-prone, and
  redacting names doesn't remove style-based re-identifiability anyway.

## Outcome (2026-06-16)
Shipped + verified. Pure logic unit-checked (7/7): catches a real 7-word leak,
spares short catchphrases, punctuation/case-insensitive, respects the n-gram
boundary (6-word overlap ≠ hit at n=7), tokenizer normalizes, empty input safe.
Integration test on a synthetic distinctive voice **caught a genuine regurgitation**
— the reduce quoted a full ~15-word source sentence verbatim as a "signature line"
(13 overlapping 7-gram shingles of the one leaked run); the warning fired and
soul.md was written **unchanged** (confirmed the leaked span is present in the
output, i.e. log-only not strip). Backend typecheck clean. Test user + artifacts
cleaned, DB left as found.

## Dependencies & sequencing
**Prerequisite for** [representative-samples-fewshot](../../todos/representative-samples-fewshot.md).

## Refs
code: [regurgitation.ts](../../../src/regurgitation.ts), [extract.ts](../../../src/stages/extract.ts), [prompts.ts](../../../src/prompts.ts) · corpus: [regurgitation-risk](../../wiki/concepts/regurgitation-risk.md), [privacy-not-just-memorization](../../wiki/sources/privacy-not-just-memorization.md)
