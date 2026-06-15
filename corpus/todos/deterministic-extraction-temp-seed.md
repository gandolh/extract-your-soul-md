# Deterministic extraction: temperature 0 + fixed seed

**Priority:** P1 · **Goal:** engineering · **Impact:** medium · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
`OLLAMA_TEMPERATURE=0.3` ([config.ts:51](../../src/config.ts#L51)) and no seed
([ollama.ts:16](../../src/ollama.ts#L16)). Voice extraction is analysis, not
creative writing — non-determinism means a prompt edit cannot be cleanly
attributed (output differs run-to-run regardless of the edit). The content cache
is the only thing making re-runs stable, which makes it semantically meaningless
across reruns. CLAUDE.md already admits "runs are not reproducible".

## Decision / approach (grilled 2026-06-16)
- Default `OLLAMA_TEMPERATURE` to **0** ([config.ts:51](../../src/config.ts#L51)
  + `.env.example`).
- Add a **fixed constant seed** (e.g. 42), not env-configurable: add `seed` to
  `OllamaOptions` and pass it in the `options` object at
  [ollama.ts:16](../../src/ollama.ts#L16) for both map and reduce calls.
- Seed is invariant, so it does **not** enter the cache key.
- Document determinism as best-effort (GPU nondeterminism can still leak) —
  "deterministic given fixed model+seed+temperature", not "fully reproducible".

## First step
In [ollama.ts](../../src/ollama.ts) add `seed: number` to `OllamaOptions` and
`seed: opts.seed` to the `options` body; thread the constant through both
`generate()` call sites in [extract.ts](../../src/stages/extract.ts).

## Dependencies & sequencing
Pairs with [cache-fingerprint](cache-fingerprint-prompt-model-ctx.md)
and unblocks honest A/B comparison in
[style-card-eval-harness](style-card-eval-harness.md).

## Refs
code: [ollama.ts](../../src/ollama.ts), [config.ts](../../src/config.ts), [extract.ts](../../src/stages/extract.ts)
