# Brief 02 — Reconcile chunk budget with Ollama context window (stop silent truncation)

**Promoted from:** [todos/extraction-context-budget-truncation.md](../../todos/extraction-context-budget-truncation.md)
**Priority:** P1 · **Goal:** accuracy · **Impact:** high · **Effort:** M · **Captured:** 2026-06-16 · **Promoted:** 2026-06-16 · **Done:** 2026-06-16

## Outcome (2026-06-16)
Implemented as specced. [chunk.ts](../../../src/stages/chunk.ts): added
`HEADER_RESERVE=600` / `OUTPUT_RESERVE=512`, derived
`budget = min(chunkTargetTokens, ollamaNumCtx − HEADER_RESERVE − OUTPUT_RESERVE)`
at the top of `chunkAll`, replaced all four `cfg.chunkTargetTokens` packing uses
with `budget`, added a clamp warning, and record the effective `budget` in the
manifest's `chunkTargetTokens`. [extract.ts](../../../src/stages/extract.ts):
added `assertFitsContext()` and call it before both the map and reduce
`generate()` calls — throws an actionable error instead of letting Ollama
silently truncate. `.env.example`: documented the
`chunkTargetTokens + header + output < num_ctx` invariant and the auto-scaling
note on `OLLAMA_NUM_CTX`. `npm run build` clean. Verified budget math:
8192→7080 (clamps, warns), 32768→30000 (full target). With defaults the model
now sees ~100% of each chunk (~7080 tok) instead of being fed 30k and truncated
to ~8k. Privacy note from the todo still stands — more corpus is now visible to
the model; the gitignore + manual-review safety net is unchanged.

Interim backstop only for reduce overflow; hierarchical tree-reduce
([hierarchical-tree-reduce](../../todos/hierarchical-tree-reduce.md)) remains the
proper fix and is still a todo.

## Why
The single largest silent accuracy loss in the Ollama path. Freeform chunks pack
to `CHUNK_TARGET_TOKENS=30000` but the map call runs at `OLLAMA_NUM_CTX=8192`.
Ollama **silently truncates** anything past `num_ctx`; the prompt header survives
(first), so ~22k of every 30k chunk is discarded before the model reads it — the
model writes confident bullets from ~30% of the corpus. The **reduce step
overflows too** ([extract.ts:65](../../../src/stages/extract.ts#L65)): all
per-chunk bullets + a ~575-tok header accumulate unbounded. Hits CLI (`--ollama`)
and web. The Claude `/extract-soul` path is unaffected (no `num_ctx` limit).

Measured header sizes (from build): MAP=217, MAP_QA=377, REDUCE=575 tok.

## Scope (the change)
### 1. Derive the budget from the context window — [chunk.ts](../../../src/stages/chunk.ts) `chunkAll`
- Add `const HEADER_RESERVE = 600, OUTPUT_RESERVE = 512;` (600 covers MAP_QA≈377
  + the per-chunk `# Source files…` file header + `--- name ---` separators; 512
  for generated output).
- Compute at the top of `chunkAll`:
  `const budget = Math.min(cfg.chunkTargetTokens, cfg.ollamaNumCtx - HEADER_RESERVE - OUTPUT_RESERVE);`
- Replace the four `cfg.chunkTargetTokens` uses (lines 86, 89, 99, 121) with `budget`.
- Stream a one-line warning when `budget < cfg.chunkTargetTokens` (it clamped down).
- Record `budget` in the manifest (`chunkTargetTokens: budget`) so it reflects
  what was actually used.

### 2. Reduce + map overflow → assert-fail backstop — [extract.ts](../../../src/stages/extract.ts)
- Before the reduce `generate()`: assert `estimateTokens(reducePrompt) <= cfg.ollamaNumCtx`;
  throw an actionable error naming the overflow if violated (hierarchical
  tree-reduce is the proper fix later — see
  [hierarchical-tree-reduce](../../todos/hierarchical-tree-reduce.md)).
- Same pre-`generate()` assertion on the **map** prompt as a backstop against
  stale manifests / future header growth.

### 3. Docs — `.env.example`
- Document the invariant `chunkTargetTokens + maxHeaderTokens + outputReserve < ollamaNumCtx`.
- Note: keep `OLLAMA_NUM_CTX=8192` default (safe on WSL2); raising it auto-scales
  chunk size — the opt-in for capable GPUs.

## Out of scope (locked)
- Hierarchical tree-reduce (separate todo) — assert-fail is the interim backstop.
- `OLLAMA_NUM_CTX` default stays 8192.

## Verify
- `npm run build` typechecks clean.
- With defaults (8192 ctx): budget clamps to `8192-600-512 = 7080`; warning fires.
- `splitOversizedFile` preserves `kind='questionnaire'` when sharding the Q&A file.

## Refs
code: [chunk.ts](../../../src/stages/chunk.ts), [extract.ts](../../../src/stages/extract.ts), [config.ts](../../../src/config.ts), [tokens.ts](../../../src/tokens.ts) · depends-on: brief 01 (cache fingerprint, done) · corpus: [regurgitation-risk](../../wiki/concepts/regurgitation-risk.md)
