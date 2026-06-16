# 33 — Honest token accounting (count headers/separators) + UTF-8 byte heuristic

**Priority:** P2 · **Goal:** accuracy · **Impact:** medium · **Effort:** S · **Status:** done · **Promoted:** 2026-06-16 (from `todos/token-accounting-header-model.md`) · **Done:** 2026-06-16

## Outcome (2026-06-16)
Two safe, no-dependency changes; the model-raise third was dropped as obsolete
(see below).

**1. Framing folded into the chunk budget** — [chunk.ts](../../../src/stages/chunk.ts).
Previously the per-chunk comment header and the `--- name ---` body separators
were written AFTER packing, so a chunk packed to `budget` in body tokens spilled
past it once framed — eating into the `HEADER_RESERVE`/`OUTPUT_RESERVE` margin
(only the `assertFitsContext` backstop caught real overflow). Now:
- New `CHUNK_HEADER_FIXED_TOKENS = 48` covers the fixed comment-header lines.
- New `framingTokens(name)` returns the per-file cost: the name in the
  `# Source files:` CSV + its `--- name ---\n` separator + the `\n` join,
  mirroring the exact strings written.
- Packing tracks a `framing` field per bucket; the first-fit test is now
  `CHUNK_HEADER_FIXED_TOKENS + framing + content + newFileFraming <= budget`.
- Oversized-file splitting sizes content against a `contentBudget(name)` =
  `budget − header − framing`, using the `#partN` name length for split parts.

The manifest's `estimatedTokens` / `totalEstimatedTokens` still report CONTENT
tokens (matching the header's "Estimated tokens:" line, which describes the
body) — framing is reserved on top during packing, not folded into the reported
figure. Net effect: chunks are slightly smaller and the written file genuinely
fits `num_ctx`; the manifest no longer under-claims.

**2. `estimateTokens` → UTF-8 bytes / 4** — [tokens.ts](../../../src/tokens.ts).
`Math.ceil(text.length / 4)` → `Math.ceil(Buffer.byteLength(text, 'utf8') / 4)`.
BPE operates on UTF-8 bytes, so Romanian diacritics (ăâîșț, 2 bytes) and emoji
(4 bytes) cost more than one ASCII char of budget. Counting bytes makes the
estimate conservative (slightly larger) for diacritic/emoji-heavy RO/EN text —
the safe direction, since undercounting risks silent truncation. Pure ASCII is
unchanged. Heuristic stays per `decisions.md`; NO `gpt-tokenizer` dep (its BPE
doesn't match Llama's). Verified: "ăâîșțĂÂÎȘȚ" → 5 tokens (byte) vs 3 (char).

**3. Model-raise — DROPPED as obsolete.** The todo assumed the default was the
weak `llama3.1:8b`. It isn't: `decisions.md` already locks the default to
`gpt-oss:120b-cloud` (Ollama Cloud, brief 08) — a strong multilingual model.
The "raise the default" half is moot; nothing to do, no decisions.md change.

Both typechecks + `build:server` clean. Nothing committed.

## Cache note
No bullet-cache fingerprint field changed. The byte heuristic can shift chunk
*boundaries*, which re-chunks content and re-maps the changed chunks — correct
behavior (a genuine input change), not spurious invalidation.

## Problem
`estimateTokens` was char/4 and the chunk framing was uncounted, so the written
chunk was larger than the manifest claimed and the byte cost of diacritics/emoji
was undercounted. Mostly subsumed by brief 02 (the `num_ctx`-derived budget +
`HEADER_RESERVE` already bought margin and `assertFitsContext` backstops
overflow) — this is the honest-manifest follow-up so the reserve isn't silently
consumed by framing.

## Refs
code: [chunk.ts](../../../src/stages/chunk.ts), [tokens.ts](../../../src/tokens.ts) · corpus: [decisions.md](../../wiki/decisions.md), [briefs/done/02](02-extraction-context-budget-truncation.md), [briefs/done/08](08-ollama-cloud-backend.md)
