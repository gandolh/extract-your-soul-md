# Architecture — how the code is put together

The structural map of *extract-your-soul-md*. For the *why* behind the
questionnaire path, see [overview.md](overview.md). The root
[CLAUDE.md](../../CLAUDE.md) is the authoritative run-command reference; this page
is the orientation layer.

## Two front doors over one shared core

```
            ┌──────────────── shared pipeline (src/stages/) ────────────────┐
            │  process.ts  →  chunk.ts  →  extract.ts (Ollama) / map-reduce  │
            └───────────────────────────────────────────────────────────────┘
                 ▲                                            ▲
                 │                                            │
   CLI pipeline (npm run start)                  Web platform (npm run dev)
   file-based, single-user                       React SPA + Fastify + SQLite
   src/index.ts                                  src/server/, src/db/, frontend/
```

1. **CLI pipeline** — the original single-user, file-based data prep + extraction.
   Pure data prep by default (no LLM); two extraction paths (Claude `/extract-soul`
   skill, or local Ollama).
2. **Web platform** — multi-user React SPA + Fastify API + SQLite, layered over
   the *unchanged* CLI core. SQLite (`data/soul.sqlite`) is the source of truth;
   it generates the file-based pipeline inputs on demand at extraction time.

## Pipeline stages (`src/stages/`)

- **`process.ts`** — parses WhatsApp exports, filters to the user's own messages
  (the load-bearing voice filter), drops noise, dedups → `inputs/processed/`.
  Also parses `inputs/questionnaire/answers.md` into `__questionnaire__.txt`.
- **`chunk.ts`** — file-bounded first-fit packing into ~30k-token chunks +
  `manifest.json` (records ordering, sources, `kind: freeform | questionnaire`).
  The questionnaire is always isolated into its own chunk.
- **`interview.ts`** — the `--interview` REPL (Stage 0): walks the 10+1 questions,
  writes `answers.md` via `answers-file.ts`.
- **`extract.ts`** + **`ollama.ts`** — the Ollama map/reduce path (Path B), with
  per-chunk content-hash caching under `.cache/bullets/`.

Shared helpers: `config.ts` (zod-validated env), `questions.ts` (the question
data), `prompts.ts` (map/reduce prompt headers, incl. the Q&A variant),
`answers-file.ts` (the single source of truth for the `answers.md` format),
`tokens.ts` (cheap ~4 chars/token estimator), `studies.ts` (presentation layer
grouping questions into themed web studies), `color.ts`.

## Web platform

- **`src/db/`** — `schema.sql` (idempotent, WAL), `db.ts` (`node:sqlite`
  singleton), `repos.ts` (synchronous prepared-statement DAL). Tables: `users`,
  `sessions`, `study_answers`, `conversations`, `user_names`, `results`.
- **`src/server/`** — `app.ts` (Fastify wiring), `serve.ts` (listen), `auth.ts`
  (scrypt + cookie sessions), `pipeline.ts` (per-user extraction), `routes/`
  (`auth`, `studies`, `conversations`, `results`).
- **`frontend/`** — own Vite root + tsconfig (DOM + react-jsx). Base UI
  (`@base-ui-components/react`), `react-router-dom`. Proxies `/api`→4317 in dev.

### Per-user extraction (`src/server/pipeline.ts`)
`POST /api/extract` clones `Config` into a throwaway work dir, writes the user's
conversations + answers there via the unchanged `writeAnswersFile`, runs the
unchanged `processAll → chunkAll → runOllamaPipeline`, reads the result into the
`results` table, deletes the work dir. The programmatic extractor is
**always Ollama** — the Claude `/extract-soul` path can't run from inside an HTTP
request, so it stays CLI-only.

## The output contract

`out/my-soul.md` is the only artifact downstream tools depend on. Keep it stable;
swap extraction strategies freely. The previous version is backed up to
`out/my-soul.prev.md` before each overwrite.

## Code references

Paths above are relative to the repo root. They drift — verify a path or symbol
(`../../src/...`, e.g. [../../src/stages/process.ts](../../src/stages/process.ts))
before acting on a claim here.
