# Add CI (typecheck + build)

**Priority:** P2 · **Goal:** engineering · **Impact:** medium · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
No CI — no `.github/`, so nothing runs `tsc`, `vite build`, or the frontend
typecheck on push. Regressions ship freely, risky given the experimental
`node:sqlite` and pinned-RC `@base-ui-components/react` flagged in CLAUDE.md.

## Decision / approach (audit-refined — ship only gates that pass today)
- Add `.github/workflows/ci.yml` (Node 24, `npm ci`) running **`npm run build`**
  and **`npm run typecheck:web`** — both verified to exit 0 locally.
- **Do NOT add `npm test`** to the workflow yet — there's no `test` script; it
  would fail on missing-script. Add it once
  [node-test-golden-tests](node-test-golden-tests.md) lands.
- Note the change in [decisions.md](../wiki/decisions.md) (it records "no test
  runner / manual testing for now") + a `log.md` entry.

## First step
Create `.github/workflows/ci.yml` on push/PR with `npm ci`, `npm run build`,
`npm run typecheck:web`.

## Refs
code: `package.json` scripts · corpus: [decisions.md](../wiki/decisions.md), [03-integration-plan](../wiki/sources-raw/03-integration-plan.md)
