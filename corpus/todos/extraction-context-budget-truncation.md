# Reconcile chunk budget with Ollama context window (stop silent truncation)

**Priority:** P1 · **Goal:** accuracy · **Impact:** high · **Effort:** M · **Status:** todo · **Captured:** 2026-06-16

## Problem
The single largest silent accuracy loss in the Ollama path. Freeform chunks pack
to `CHUNK_TARGET_TOKENS=30000` ([config.ts:43](../../src/config.ts#L43), and the
live `.env`) but the map call runs at `OLLAMA_NUM_CTX=8192`
([config.ts:50](../../src/config.ts#L50)). Ollama **silently truncates** anything
past `num_ctx`; the prompt header survives (it's first), so roughly the last ~22k
of every 30k chunk is discarded before the model reads a word — the model writes
confident bullets from ~30% of the corpus. The **reduce step overflows too**
([extract.ts:65](../../src/stages/extract.ts#L65)): all per-chunk bullets + a
~575-token header accumulate unbounded. Hits both CLI (`--ollama`) and web paths.
The Claude `/extract-soul` path is unaffected (no `num_ctx` limit).

## Decision / approach (grilled 2026-06-16)
- **Budget derives from the context window.** In
  [chunk.ts](../../src/stages/chunk.ts) `chunkAll`, compute
  `budget = min(cfg.chunkTargetTokens, cfg.ollamaNumCtx - HEADER_RESERVE - OUTPUT_RESERVE)`
  (reserve ~600 for the largest map header `MAP_QA≈378`, ~512 for output) and use
  it everywhere `cfg.chunkTargetTokens` is used today (lines 86, 89, 99, 121).
  Stream a warning when it clamps down.
- **Keep `OLLAMA_NUM_CTX=8192` as the default** (safe on any hardware incl. WSL2).
  Because the budget derives from `num_ctx`, raising it later auto-scales chunk
  size — document raising it as the opt-in for capable GPUs.
- **Reduce overflow → assert-fail backstop now** (no silent loss): before the
  reduce `generate()`, assert `estimateTokens(prompt) <= cfg.ollamaNumCtx` and
  throw an actionable error if violated. Hierarchical tree-reduce is the proper
  fix later — see [hierarchical-tree-reduce](hierarchical-tree-reduce.md).
- Add the same pre-`generate()` assertion to the **map** call as a backstop
  against stale manifests / future header growth.
- Update `.env.example`: document the invariant
  `chunkTargetTokens + maxHeaderTokens + outputReserve < ollamaNumCtx`.

## First step
In [chunk.ts](../../src/stages/chunk.ts) add `const HEADER_RESERVE = 600, OUTPUT_RESERVE = 512;`
and a derived `budget` at the top of `chunkAll`; replace the four `cfg.chunkTargetTokens`
uses with `budget`; warn on clamp.

## Dependencies & sequencing
- Clamping shards the questionnaire chunk into Q&A parts when answers exceed the
  budget — fine, `splitOversizedFile` preserves `kind='questionnaire'`.
- Re-runs are cheap once [cache-fingerprint](cache-fingerprint-prompt-model-ctx.md)
  lands; re-chunked content just produces new cache keys.
- Privacy note: this makes ~100% of the corpus visible to the model (vs ~30%),
  which raises real signal AND the re-identification/regurgitation surface. Keep
  the gitignore + manual-review safety net intact (see
  [regurgitation-risk](../wiki/concepts/regurgitation-risk.md)).

## Refs
code: [chunk.ts](../../src/stages/chunk.ts), [extract.ts](../../src/stages/extract.ts), [config.ts](../../src/config.ts), [tokens.ts](../../src/tokens.ts) · corpus: [regurgitation-risk](../wiki/concepts/regurgitation-risk.md)
