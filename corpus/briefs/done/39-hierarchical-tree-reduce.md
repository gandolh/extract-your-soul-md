# 39 — Hierarchical tree-reduce (lift the reduce-prompt num_ctx ceiling)

**Priority:** P3 · **Goal:** accuracy · **Impact:** medium · **Effort:** M · **Status:** done · **Promoted:** 2026-06-26 (from `todos/hierarchical-tree-reduce.md`, built speculatively ahead of a heavy-user trigger per explicit user decision) · **Done:** 2026-06-26

## Outcome (2026-06-26)
Shipped — the reduce-prompt `num_ctx` ceiling is lifted. Built by a sub-agent in
an isolated worktree, integrated to main.
- `MERGE_BULLETS_HEADER` added to `prompts.ts` (condense/dedup bullets only; no
  soul.md sections, no profile). `treeReduceBullets(cfg, batches, generateFn?,
  onMergeProgress?)` added to `extract.ts`.
- Algorithm: `bodyBudget = num_ctx − 768 − 1024`. Base case (≤1 batch or already
  fits) returns batches unchanged → **small corpora make zero merge calls**.
  Otherwise greedily packs batches into `groupBudget = min(num_ctx −
  mergeHeader − 1024, bodyBudget)` groups, one `MERGE` `generate` per group,
  recurse until a level fits. `groupBudget ≤ bodyBudget` guarantees progress.
- Profile + rejected batches and the full `buildReducePrompt(...)` scaffolding
  apply at the **final reduce only** — never inside a merge group (briefs
  26/27/28 conditional-section behavior preserved). `assertFitsContext('reduce',…)`
  kept as the final backstop; verbatim-overlap guard + `my-soul.prev.md` backup
  unchanged.
- Injection seam: `export type GenerateFn = typeof generate`; optional
  trailing `generateFn = generate` param. Determinism preserved (same
  `EXTRACTION_SEED` + temperature on intermediate calls). Intermediate reduces
  are NOT cached (noted in a comment; reduce isn't cached today).
- Progress: `ProgressFn` signature unchanged; merge groups surface under the
  existing `'reduce'` stage (no ripple into `routes/results.ts`).
- **Tests:** 5 node:test cases in `src/stages/extract.test.ts` (stubbed
  `generate`): small set → 1 reduce call; overflow → N groups + MERGE-per-group +
  final reduce, nothing dropped; profile/rejected only in the final reduce prompt.
- **Live-Ollama E2E** (cloud `gpt-oss:120b-cloud`, forced `num_ctx=2200`): 10
  synthetic bullet batches (~1468 tok) overflowed the 408-tok bodyBudget →
  **3 recursion levels** (5 → 3 → 2 merge groups) → final 2 batches (~286 tok)
  fit. Merge prompt condensed/deduped correctly. Recursion-until-fits validated
  on the real model.

## Problem
`runOllamaPipeline` ([extract.ts](../../../src/stages/extract.ts)) concatenates
every chunk's bullets + the reduce header into one prompt, then
`assertFitsContext('reduce', …)` **throws** if it exceeds `num_ctx`. A large
corpus (~35 chunks at 8192 ctx) overflows. Brief 02 added the assert-fail
backstop (no silent loss); this brief is the proper fix that removes the ceiling.

## Decision (grilled 2026-06-26): "New merge prompt; specials final-only"
- When the per-chunk bullets + reduce header would exceed `num_ctx`, partition
  the **chunk bullet batches** into `num_ctx`-fitting groups, reduce each group
  to an intermediate condensed-bullet summary via a NEW lightweight
  `MERGE_BULLETS` prompt, then reduce the intermediates (recurse until one level
  fits). No corpus-size ceiling.
- **The special batches and section logic apply at the FINAL reduce ONLY:**
  - the self-reported **profile** batch,
  - the **rejected-statements** batch,
  - the full `buildReducePrompt(hasQuestionnaire, hasProfile, hasRejected)`
    section scaffolding.
  Intermediate `MERGE_BULLETS` levels operate purely on voice/content bullets —
  they dedup/condense, they do NOT emit soul.md-shaped sections, and they never
  see the profile/rejected material. This preserves the conditional-section
  behavior (briefs 26/27/28) intact.

## Approach
1. **[prompts.ts](../../../src/prompts.ts)** — add `MERGE_BULLETS_HEADER` (and a
   small builder if needed). It instructs the model: "These are extracted
   voice/content bullets from several batches of one person's material. Merge
   them into a single deduplicated, condensed bullet list preserving every
   distinct observation; do not write prose sections, do not synthesize a
   profile." Keep it short — it must leave room for a full `num_ctx` group.
   **This agent OWNS prompts.ts** (brief 38 deliberately does not touch it).
2. **[extract.ts](../../../src/stages/extract.ts)** — extract the bullet-set →
   reduce step into a helper. New `treeReduceBullets(cfg, bulletBatches)`:
   - estimate tokens of `MERGE_BULLETS_HEADER + batches.join(...)`;
   - if it fits `num_ctx` minus the final-reduce reserve, return the batches
     unchanged (no extra level — small corpora pay nothing);
   - else greedily pack batches into `num_ctx`-fitting groups (reuse the
     `estimateTokens` heuristic from [tokens.ts](../../../src/tokens.ts) and the
     same byte-accounting as brief 33), run a `MERGE_BULLETS` `generate()` per
     group, recurse on the resulting intermediate summaries.
   - Determinism: pass the same `EXTRACTION_SEED` + temperature; intermediate
     `generate` calls go through the same `ollama.ts` path. (Caching intermediate
     reduces is OUT of scope — reduce isn't cached today; a comment noting this is
     enough.)
   - `onProgress`: surface tree-reduce levels without breaking the existing
     `'map'|'reduce'` stage contract — emit them under `'reduce'` (e.g. a
     coarse done/total across merge groups), or add a comment if you keep it
     simple. Do NOT change the `ProgressFn` type signature without noting the
     downstream `job` consumer in [routes/results.ts].
   - The FINAL reduce still calls `buildReducePrompt(...)` over
     `[treeReducedBullets, profileBatch?, rejectedBatch?]` and still runs the
     `assertFitsContext('reduce', …)` backstop — which should now never trip on
     bullet volume alone, but stays as a guard against a single oversized batch.
3. Keep the verbatim-overlap guard + my-soul.prev.md backup behavior unchanged.

## Testing (no live Ollama required for unit tests)
- node:test in `src/stages/extract.test.ts` (or a focused new test file): inject a
  **stub `generate`** (the agent may need a small seam — e.g. a default param or a
  module the test can spy; do NOT over-engineer — a thin injectable function is
  fine). Assert:
  - small bullet set → NO intermediate level (generate called once for reduce);
  - large synthetic bullet set that overflows → partitioned into N fitting groups,
    `MERGE_BULLETS` called per group, then a final reduce; nothing dropped
    (every input observation reachable);
  - the profile + rejected batches appear ONLY in the final reduce prompt, never
    in a merge-group prompt.
- `npm run typecheck:test` clean.

## Refs
code: [extract.ts](../../../src/stages/extract.ts), [prompts.ts](../../../src/prompts.ts), [tokens.ts](../../../src/tokens.ts), [chunk.ts](../../../src/stages/chunk.ts), [routes/results.ts](../../../src/server/routes/results.ts) · corpus: [02-extraction-context-budget-truncation](../done/02-extraction-context-budget-truncation.md), [33-honest-token-accounting](../done/33-honest-token-accounting.md)
