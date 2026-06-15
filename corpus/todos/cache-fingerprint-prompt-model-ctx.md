# Fingerprint the bullet cache by model / prompt / ctx / temperature

**Priority:** P1 · **Goal:** engineering · **Impact:** high · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
The per-chunk cache key is `hash(`${kind}\n${content}`)` only
([extract.ts:21](../../src/stages/extract.ts#L21)) — no model, `num_ctx`,
temperature, or prompt version. Editing a map prompt, switching `OLLAMA_MODEL`,
raising `OLLAMA_NUM_CTX`, or changing temperature does **not** invalidate cached
bullets, so prompt/model improvements silently reuse stale low-quality
extractions and appear to have no effect. This actively nullifies every
prompt-fidelity change — it is the prerequisite that makes prompt iteration
real.

## Decision / approach (grilled 2026-06-16)
- Move the header selection (`MAP_PROMPT_HEADER` vs `MAP_PROMPT_HEADER_QA`,
  already chosen at [extract.ts:26](../../src/stages/extract.ts#L26)) above the
  key computation and **hash the live header string** — auto-invalidation, no
  hand-bumped `PROMPT_VERSION` constant (which can go stale).
- New key:
  `hash(`${kind}\n${cfg.ollamaModel}\n${cfg.ollamaNumCtx}\n${cfg.ollamaTemperature}\n${headerHash}\n${content}`)`.
- Seed is **not** in the key (fixed constant — see
  [deterministic-extraction](deterministic-extraction-temp-seed.md)).
- Reduce caching stays out of scope (reduce always re-runs; low value).

## First step
In [extract.ts](../../src/stages/extract.ts) compute `headerHash` from the chosen
header and fold model/ctx/temp/headerHash into the line-21 key.

## Dependencies & sequencing
- **Must land before** any prompt-iteration todo (reframe, anti-generic, etc.)
  or those edits will appear to do nothing on re-runs.
- Old cache files become harmless dead weight (new keys just miss) — fine to leave.
- Known adjacent issue (separate todo): `.cache/bullets` resolves against process
  CWD, so on the web platform **all users share one cache** — see
  [expired-session-sweep](expired-session-sweep.md) notes.

## Refs
code: [extract.ts](../../src/stages/extract.ts), [config.ts](../../src/config.ts) · corpus: [llm-persona-techniques](../wiki/frameworks/llm-persona-techniques.md) ("prompting > model size")
