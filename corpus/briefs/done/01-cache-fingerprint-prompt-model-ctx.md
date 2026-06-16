# Brief 01 — Fingerprint the bullet cache by model / prompt / ctx / temperature

**Promoted from:** [todos/cache-fingerprint-prompt-model-ctx.md](../../todos/cache-fingerprint-prompt-model-ctx.md)
**Priority:** P1 · **Goal:** engineering · **Impact:** high · **Effort:** S · **Captured:** 2026-06-16 · **Promoted:** 2026-06-16 · **Done:** 2026-06-16

## Outcome (2026-06-16)
Implemented exactly as specced in [extract.ts](../../../src/stages/extract.ts):
moved the header selection above the key computation, added
`headerHash = hash(header)`, and folded
`kind / model / numCtx / temperature / headerHash / content` into the cache key.
Seed excluded (fixed constant); reduce caching untouched. `npm run build`
(server `tsc` + web `vite build`) typechecks clean. Old `.cache/bullets/*.txt`
become harmless misses on next run. Prompt-iteration todos (truncation, reframe,
anti-generic) are now unblocked — their edits will actually invalidate the cache.

## Why this is first in the build-order
This is the P1 foundation prerequisite. The per-chunk bullet cache currently keys
on `hash(`${kind}\n${content}`)` only ([extract.ts:21](../../../src/stages/extract.ts#L21)).
Changing a map prompt, switching `OLLAMA_MODEL`, raising `OLLAMA_NUM_CTX`, or
changing `OLLAMA_TEMPERATURE` does **not** invalidate cached bullets — so every
downstream prompt/model quality change silently reuses stale low-quality
extractions and *appears to have no effect*. Until this lands, prompt iteration
is a no-op on re-runs. Must land before truncation, reframe, anti-generic, etc.

## Scope (the change)
In [extract.ts](../../../src/stages/extract.ts), inside `extractChunk`:
1. Select the map header (`MAP_PROMPT_HEADER_QA` for `kind==='questionnaire'`,
   else `MAP_PROMPT_HEADER`) **above** the key computation (it's at line 26 today,
   below the key at line 21).
2. Compute `headerHash = hash(header)` from the live header string — no
   hand-bumped `PROMPT_VERSION` constant (which goes stale).
3. New key:
   `hash(`${kind}\n${cfg.ollamaModel}\n${cfg.ollamaNumCtx}\n${cfg.ollamaTemperature}\n${headerHash}\n${content}`)`.

## Out of scope (locked decisions)
- Seed is **not** in the key (fixed constant — see
  [deterministic-extraction](../../todos/deterministic-extraction-temp-seed.md)).
- Reduce caching stays out of scope (reduce always re-runs; low value).
- The per-CWD shared-cache issue on the web platform is a separate todo — not
  touched here.

## Verify
- `npm run build` typechecks clean.
- Manual reasoning check: two chunks with identical content but different
  `kind` / model / ctx / temp / header now produce different keys; identical
  inputs still hit cache. Old `.cache/bullets/*.txt` become harmless misses.

## Refs
code: [extract.ts](../../../src/stages/extract.ts), [config.ts](../../../src/config.ts) · corpus: [llm-persona-techniques](../../wiki/frameworks/llm-persona-techniques.md) ("prompting > model size")
