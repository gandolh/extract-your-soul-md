# 34 — Golden tests for the no-LLM data-prep core (node:test)

**Priority:** P2 · **Goal:** engineering · **Impact:** medium · **Effort:** S · **Status:** done · **Promoted:** 2026-06-16 (from `todos/node-test-golden-tests.md`) · **Done:** 2026-06-16

## Outcome (2026-06-16)
First test infrastructure in the project, using **`node:test`** + the **`tsx`**
loader — zero new dependency on Node 24 (`tsx` is already a devDependency).
**Flips the locked "no test runner" decision** (see `decisions.md` update +
log note).

**Scripts** ([package.json](../../../package.json)):
- `"test": "node --test --no-warnings=ExperimentalWarning --import tsx \"src/**/*.test.ts\""`
- `"typecheck:test": "tsc -p tsconfig.test.json"` — type-checks the test files
  (`tsx` strips types at runtime, so a separate typecheck keeps them honest).

**Build isolation:** the prod `tsconfig.json` now excludes `src/**/*.test.ts`,
so `build:server` does NOT compile test files into `dist/` (no test code ships).
A new `tsconfig.test.json` extends the base with `noEmit` and re-includes
everything for the typecheck pass.

**Tests (12, all pass):**
- [tokens.test.ts](../../../src/tokens.test.ts) — `estimateTokens`: empty=0,
  ASCII ~4 bytes/token, diacritics cost MORE than char/4 (pins brief 33's byte
  heuristic), emoji = 4 bytes.
- [answers-file.test.ts](../../../src/answers-file.test.ts) — the load-bearing
  `answers.md` contract: `writeAnswersFile → parseAnswersFile` round-trip
  (id/title/multiline body), empty body → `[skipped]` marker, missing file →
  empty map, QUESTIONS-order output regardless of input order. (Directly guards
  the format contract recorded in MEMORY.md.)
- [stages/pipeline.test.ts](../../../src/stages/pipeline.test.ts) — fs-coupled
  (mkdtemp + a throwaway `Config`): `processAll` keeps only the user's own
  messages and drops URL/media/short/dup noise; continuation-line merge;
  `chunkAll` isolates the questionnaire into its own `questionnaire`-kind chunk;
  and — proving brief 33 end-to-end — every WRITTEN chunk's whole-file byte size
  (header + separators + body) fits the `num_ctx`-derived budget, with manifest
  totals matching the per-chunk sums.

Inner parsers (`parseLine`, `parseQuestionnaire`) stay private — tested through
`processAll` end-to-end rather than exported just for tests.

`npm test`, `npm run typecheck:test`, `npm run typecheck:web`, and
`build:server` all clean. Nothing committed.

## Dropped from the todo
The "Vitest for the frontend" half — deliberately skipped (adds a dep for little
value on a thin SPA). Recorded in `decisions.md`.

## Problem
Zero test infrastructure, yet the pipeline has deterministic, high-stakes logic
that breaks silently: the voice filter (only the user's own messages may
survive), noise/dedup, continuation merge, questionnaire isolation, the chunk
budget, and the `answers.md` format contract three modules agree on.

## Refs
code: [package.json](../../../package.json), [tsconfig.test.json](../../../tsconfig.test.json), [tokens.test.ts](../../../src/tokens.test.ts), [answers-file.test.ts](../../../src/answers-file.test.ts), [stages/pipeline.test.ts](../../../src/stages/pipeline.test.ts) · corpus: [decisions.md](../../wiki/decisions.md), [ci-typecheck-build todo](../../todos/ci-typecheck-build.md)
