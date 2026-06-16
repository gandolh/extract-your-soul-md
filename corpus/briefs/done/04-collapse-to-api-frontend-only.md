# Brief 04 — Collapse to a single API + frontend surface (remove the CLI)

**New brief** (not promoted from a todo — architectural decision made 2026-06-16 with the user).
**Priority:** P1 · **Goal:** engineering · **Impact:** high · **Effort:** M · **Captured:** 2026-06-16 · **Promoted:** 2026-06-16 · **Done:** 2026-06-16

## Outcome (2026-06-16)
Implemented in full. [index.ts](../../../src/index.ts) inverted to a thin server
entry (load config → optional `--port=` → `runServe`); all data-prep
orchestration, `--interview`/`--ollama`/`--en` flags, `parseFlags`, and
`hasFreeformFiles` removed. Deleted `src/stages/interview.ts`,
`.claude/skills/extract-soul/`, `.claude/agents/soul-chunk-extractor.md`, and
`loadMyNames` + `MY_NAMES_FILE` + the `myNamesFile` config field (web uses DB
`getNames`). `package.json`: dropped `start` and `interview`; `dev:api` /
`serve:prod` now use `--port=` only. Updated the stale "run npm run start"
message in `process.ts`, the `pipeline.ts` header comment, and `.env.example`.
Docs rewritten: root `CLAUDE.md` and `README.md` (both via subagents, verified
against code), plus `wiki/architecture.md` and `wiki/decisions.md`.

Verified: `npm run build` + `npm run typecheck:web` both clean; the compiled
server boots from the new entry and serves `/api` (probed on a throwaway port);
grep sweep finds no dangling CLI refs in code or active docs (only the correct
negation in CLAUDE.md). The shared pipeline (`process → chunk → extract`) is
untouched and still invoked by `server/pipeline.ts`. The project is now a single
API + frontend surface, Ollama-only.

## Why
Decision (user, 2026-06-16): the project should have **only an API + frontend, no
CLI**. Today the repo has "two front doors over a shared core" (CLAUDE.md) — the
web platform AND a CLI data-prep pipeline (`npm run start`, `--interview`,
`--ollama`) plus the Claude `/extract-soul` skill path. The web platform already
covers every CLI capability: studies forms replace `--interview` (both write the
same `answers.md`), and `/api/extract` → `runUserExtraction` already runs the
unchanged `process → chunk → ollama` pipeline per user. The CLI is now redundant
duplication. **Commit fully to Ollama-only**; the higher-quality `/extract-soul`
path is deleted too (user decision — single-surface product > the quality path
that depended on repo-root `chunks/`).

This must land **before** the eval harness (brief 05) so eval is built on the
API-only world, not wired into `index.ts`'s soon-to-be-deleted `parseFlags`.

## What is NOT touched (the shared core stays)
`process.ts`, `chunk.ts`, `extract.ts`, `ollama.ts`, `tokens.ts`, `prompts.ts`,
`answers-file.ts`, `questions.ts`, `studies.ts`, `config.ts` (minus `loadMyNames`),
the whole `server/` and `db/` tree, and `frontend/`. All reused by
[pipeline.ts](../../../src/server/pipeline.ts) — deleting any of it breaks
extraction. Verify each deletion target has no remaining importer first.

## Scope (the change)
1. **Invert [index.ts](../../../src/index.ts) into a thin server entry.** It is
   currently both the CLI orchestrator AND the `--serve` entry. Strip the
   data-prep orchestration (process/chunk/ollama console flow), `--interview`,
   `--ollama`, `--en`, `parseFlags`, `hasFreeformFiles`. Keep only: load config →
   `runServe`. Honor `--port=` (the only surviving flag) or default to
   `cfg.serverPort`.
2. **Delete [src/stages/interview.ts](../../../src/stages/interview.ts)** — the
   REPL. Confirm only `index.ts` imports it (verified: it does).
3. **Remove `loadMyNames` from [config.ts](../../../src/config.ts)** — CLI-only;
   the web path uses `getNames(userId)` from the DB. Confirm only `index.ts` uses
   it (verified).
4. **Delete the Claude extraction path:** `.claude/skills/extract-soul/` and
   `.claude/agents/soul-chunk-extractor.md`. Remove repo-root `chunks/`
   references from docs (the dir is gitignored scratch).
5. **`package.json`:** delete the `start` and `interview` scripts. Point
   `dev:api` and `serve:prod` at the inverted entry (same `--serve --port=4317`
   shape still works, or simplify to no flags). Keep `dev`, `dev:web`, `build*`,
   `serve:prod`, `typecheck:web`.
6. **Update [pipeline.ts](../../../src/server/pipeline.ts) header comment** —
   drop "The Claude /extract-soul agent path stays CLI-only" (there is no CLI).
7. **Docs:** rewrite the CLI-facing sections of root `CLAUDE.md` (the "Two faces"
   framing, CLI commands, Path A/B). Update corpus `wiki/architecture.md` +
   `wiki/decisions.md` to record the single-surface decision. `.env.example`:
   drop `MY_NAMES_FILE` if it's now unused (check first).

## Out of scope
- The eval harness — that's brief 05, built on top of this.
- Any change to `runUserExtraction` behavior (only its comment).
- The async job model (separate P2 todo).

## Verify
- `npm run build` (server `tsc` + web `vite build`) clean — proves no dangling
  imports after deletions.
- `npm run dev` still boots the API + SPA; `/api/extract` still works end-to-end
  (the path that matters now).
- `grep -rn "loadMyNames\|runInterview\|--interview\|--ollama\|extract-soul" src/`
  returns nothing.

## Refs
code: [index.ts](../../../src/index.ts), [config.ts](../../../src/config.ts), [stages/interview.ts](../../../src/stages/interview.ts), [server/pipeline.ts](../../../src/server/pipeline.ts), [server/serve.ts](../../../src/server/serve.ts) · docs: root CLAUDE.md, [wiki/architecture.md](../../wiki/architecture.md), [wiki/decisions.md](../../wiki/decisions.md)
