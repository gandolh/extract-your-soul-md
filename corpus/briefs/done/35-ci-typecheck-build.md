# 35 — Add CI (build + typecheck + test)

**Priority:** P2 · **Goal:** engineering · **Impact:** medium · **Effort:** S · **Status:** done · **Promoted:** 2026-06-16 (from `todos/ci-typecheck-build.md`) · **Done:** 2026-06-16

## Outcome (2026-06-16)
Added [.github/workflows/ci.yml](../../../.github/workflows/ci.yml) — the
project's first CI. Runs on **push to `main`** and **every pull request**:

1. `actions/checkout@v4`
2. `actions/setup-node@v4` with `node-version: '24'` (required for `node:sqlite`)
   + `cache: npm`
3. `npm ci` (lockfile present, verified)
4. `npm run build` — `build:server` (backend tsc → `dist/`, doubles as the
   backend typecheck) + `build:web` (Vite SPA → `dist/public/`)
5. `npm run typecheck:web`
6. `npm run typecheck:test`
7. `npm test`

All four gate commands verified to exit 0 locally before filing.

**The todo's "do NOT add `npm test` yet" caveat is now SATISFIED** — it was
gated on [brief 34](34-node-test-golden-tests.md), which landed immediately
before this one and added the `test` + `typecheck:test` scripts. So this CI
ships the full gate set (build + both typechecks + tests), not the reduced
build-only set the todo specced when no test script existed.

**No Ollama in CI** — every gate is deterministic and offline; the LLM
map/reduce path is never invoked, so no model host or API key is needed.

Recorded in `decisions.md` (new "CI runs on GitHub Actions" entry, flipping the
prior "no CI"; the test-runner entry from brief 34 already noted tests run in CI).

Nothing committed — the workflow file will first execute once it's pushed.

## Problem
No `.github/`, so nothing ran `tsc`, `vite build`, or the frontend typecheck on
push. Regressions could ship freely — riskier given the experimental
`node:sqlite` and the pinned-RC `@base-ui-components/react`.

## Refs
code: [.github/workflows/ci.yml](../../../.github/workflows/ci.yml), [package.json](../../../package.json) · corpus: [decisions.md](../../wiki/decisions.md), [briefs/done/34](34-node-test-golden-tests.md)
