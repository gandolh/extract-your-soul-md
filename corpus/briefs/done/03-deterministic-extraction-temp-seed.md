# Brief 03 — Deterministic extraction: temperature 0 + fixed seed

**Promoted from:** [todos/deterministic-extraction-temp-seed.md](../../todos/deterministic-extraction-temp-seed.md)
**Priority:** P1 · **Goal:** engineering · **Impact:** medium · **Effort:** S · **Captured:** 2026-06-16 · **Promoted:** 2026-06-16 · **Done:** 2026-06-16

## Outcome (2026-06-16)
Implemented as specced. [ollama.ts](../../../src/ollama.ts): added `seed: number`
to `OllamaOptions` and `seed: opts.seed` to the `/api/generate` options body.
[extract.ts](../../../src/stages/extract.ts): added `const EXTRACTION_SEED = 42`
and threaded it into both `generate()` call sites (map + reduce).
[config.ts](../../../src/config.ts) + `.env.example`: `OLLAMA_TEMPERATURE`
default → 0, with a doc note framing determinism as best-effort (GPU
nondeterminism can leak). Seed stays a fixed constant, not env-configurable, and
not in the cache key. `npm run build` clean; confirmed `seed` + temp 0 reach the
request body for both calls in compiled output. This completes the P1 trio that
makes prompt iteration honest: 01 (cache invalidates on change) + 02 (model sees
the whole chunk) + 03 (output is attributable to the edit, not noise). Next:
eval harness (`style-card-eval-harness`) to turn that into a measured A/B signal.

## Why
`OLLAMA_TEMPERATURE` defaults to 0.3 and no seed is passed
([ollama.ts:16](../../../src/ollama.ts#L16)). Voice extraction is analysis, not
creative writing — non-determinism means a prompt edit can't be cleanly
attributed (output differs run-to-run regardless of the edit). The content cache
is the only thing making re-runs stable, which makes it semantically meaningless.
This is the last P1 prerequisite before the eval harness can give an honest A/B
signal. Pairs with brief 01 (cache fingerprint) and brief 02 (truncation).

## Scope (the change)
1. [ollama.ts](../../../src/ollama.ts): add `seed: number` to `OllamaOptions`;
   add `seed: opts.seed` to the `options` body of the `/api/generate` request.
2. [extract.ts](../../../src/stages/extract.ts): thread a fixed constant seed
   (`const EXTRACTION_SEED = 42;`) into both `generate()` call sites (map line 52,
   reduce line 91).
3. [config.ts:51](../../../src/config.ts#L51) + `.env.example`: default
   `OLLAMA_TEMPERATURE` to **0**.

## Out of scope (locked decisions)
- Seed is a **fixed constant, not env-configurable**, and does **not** enter the
  cache key (it's invariant — see brief 01).
- Determinism is **best-effort**: GPU nondeterminism can still leak. Frame it as
  "deterministic given fixed model + seed + temperature", not "fully
  reproducible". Don't overclaim in docs.

## Verify
- `npm run build` typechecks clean.
- `seed` and `temperature: 0` both appear in the request body for map and reduce.

## Refs
code: [ollama.ts](../../../src/ollama.ts), [config.ts](../../../src/config.ts), [extract.ts](../../../src/stages/extract.ts) · unblocks: [style-card-eval-harness](../../todos/style-card-eval-harness.md)
