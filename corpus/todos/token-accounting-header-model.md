# Honest token accounting (count headers/separators) + stronger default model

**Priority:** P2 · **Goal:** accuracy · **Impact:** medium · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
`estimateTokens` is `Math.ceil(text.length/4)` ([tokens.ts:3](../../src/tokens.ts#L3)),
consumed only by [chunk.ts](../../src/stages/chunk.ts). The per-chunk header and
`--- file ---` separators are added **after** token accounting
([chunk.ts:145-153](../../src/stages/chunk.ts#L145-L153)), so the written chunk is
larger than the manifest claims. The 4-char heuristic also undercounts Romanian
diacritics (ăâîșț) and emoji. Separately, the default `OLLAMA_MODEL=llama3.1:8b`
is weak for RO/EN code-switching and for the "omit if not evident" conditional
logic.

## Decision / approach (audit-refined — the truncation fix is the real win; this is cleanup)
- **Fold the header + `--- name ---` separators into the token budget** inside
  `chunkAll` so the manifest is honest. (Small but correct.)
- **Keep the heuristic** — `decisions.md` locks it, and the ~4 chars/token
  estimate is good enough for the only consumer (the `OLLAMA_NUM_CTX`-derived
  chunk budget from brief 02). Optionally refine to UTF-8-byte/4
  (better reflects BPE cost of diacritics/emoji) as a no-dependency change. Do
  NOT pull `gpt-tokenizer` (its BPE doesn't match Llama's).
- **Raise the default model** as a *separate* config-only change (e.g. a stronger
  local instruct/multilingual model) — unbundle it; it plausibly helps the
  conditional-section logic. Note in `decisions.md` + `log.md` (locked decision).

## First step
In `chunkAll` ([chunk.ts](../../src/stages/chunk.ts)), include the header +
separator token cost in the budget accounting.

## Dependencies & sequencing
Mostly subsumed by [extraction-context-budget-truncation](extraction-context-budget-truncation.md)
— the header reserve there already buys margin. Do that first; this is the honest-
manifest follow-up.

## Refs
code: [tokens.ts](../../src/tokens.ts), [chunk.ts](../../src/stages/chunk.ts), [config.ts](../../src/config.ts) · corpus: [decisions.md](../wiki/decisions.md)
