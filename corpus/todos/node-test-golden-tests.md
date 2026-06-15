# Golden tests for the no-LLM data-prep core (node:test)

**Priority:** P2 · **Goal:** engineering · **Impact:** medium · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
Zero test infrastructure: no runner, no `*.test.ts`, no CI. Yet the pipeline has
deterministic, high-stakes logic that breaks silently — [process.ts](../../src/stages/process.ts)
(name matching, noise filtering, continuation merge, dedup),
[chunk.ts](../../src/stages/chunk.ts) (first-fit packing, oversized split,
questionnaire isolation), [tokens.ts](../../src/tokens.ts), and
[answers-file.ts](../../src/answers-file.ts) (the documented format contract).

## Decision / approach (audit-refined)
- Use **`node:test`** (zero new dependency on Node 24) + a
  `"test": "node --test --no-warnings=ExperimentalWarning --import tsx ..."` script.
- Targets, ranked:
  1. **string-pure:** `estimateTokens`; `answers-file` round-trip
     (`writeAnswersFile → parseAnswersFile` byte/value-stable, `[skipped]`
     honored) — directly guards the MEMORY.md format contract.
  2. **fs-coupled (mkdtemp + cloned Config):** `processAll` (only myNames kept,
     noise/dup dropped, continuation-merge edge), `chunkAll` (questionnaire
     isolated to its own `kind` bucket, oversized split keeps lines, manifest
     token sums match).
- Inner parsers are private — test through `processAll` end-to-end or export them.
- Drop the Vitest-for-frontend half (adds a dep for little value).

## First step
Add the `test` script + `src/answers-file.test.ts` (round-trip a 2-question set
with one `[skipped]` — lowest effort, highest contract value).

## Dependencies & sequencing
Pairs with [ci-typecheck-build](ci-typecheck-build.md); flipping the
locked "no test runner" decision needs a `decisions.md` + `log.md` note.

## Refs
code: [process.ts](../../src/stages/process.ts), [chunk.ts](../../src/stages/chunk.ts), [tokens.ts](../../src/tokens.ts), [answers-file.ts](../../src/answers-file.ts) · corpus: [decisions.md](../wiki/decisions.md)
