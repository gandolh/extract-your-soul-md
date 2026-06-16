# Architecture — how the code is put together

The structural map of *extract-your-soul-md*. For the *why* behind the
questionnaire path, see [overview.md](overview.md). The root
[CLAUDE.md](../../CLAUDE.md) is the authoritative run-command reference; this page
is the orientation layer.

## One surface: API + frontend

```
   Web platform (npm run dev)
   React SPA + Fastify + SQLite
   src/index.ts (thin server entry) · src/server/ · src/db/ · frontend/
        │
        ▼
   shared pipeline (src/stages/)
   process.ts → chunk.ts → extract.ts (Ollama map/reduce)
```

The project is **API + frontend only** — there is no CLI (removed 2026-06-16,
[briefs/done/04](../briefs/done/04-collapse-to-api-frontend-only.md)). A
multi-user React SPA + Fastify API + SQLite. `src/index.ts` is a thin entry that
just loads config and starts the server. SQLite (`data/soul.sqlite`) is the
source of truth; the shared pipeline (`src/stages/`) is invoked per-user by
`server/pipeline.ts`, which materializes DB rows into a throwaway work dir at
extraction time. The previous "two front doors" design (a separate CLI pipeline +
the Claude `/extract-soul` skill) is gone.

## Pipeline stages (`src/stages/`)

- **`process.ts`** — parses WhatsApp exports, filters to the user's own messages
  (the load-bearing voice filter), drops noise, dedups → `inputs/processed/`.
  Also parses `inputs/questionnaire/answers.md` into `__questionnaire__.txt`.
- **`chunk.ts`** — file-bounded first-fit packing into ~30k-token chunks +
  `manifest.json` (records ordering, sources, `kind: freeform | questionnaire`).
  The questionnaire is always isolated into its own chunk.
- **`extract.ts`** + **`ollama.ts`** — the Ollama map/reduce path, with per-chunk
  caching under `.cache/bullets/` (keyed on kind + model + ctx + temp + prompt +
  content). Deterministic: temperature 0 + fixed seed. Questionnaire capture is
  the studies forms in the SPA — there is no longer a REPL.

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
`processAll → chunkAll → runOllamaPipeline`, reads the result into the `results`
table, deletes the work dir. Extraction is **always Ollama**, run synchronously
(an in-memory per-user lock guards against concurrent runs). This is the only
extraction path.

## The output contract

`out/my-soul.md` is the only artifact downstream tools depend on. Keep it stable;
swap extraction strategies freely. The previous version is backed up to
`out/my-soul.prev.md` before each overwrite.

## Code references

Paths above are relative to the repo root. They drift — verify a path or symbol
(`../../src/...`, e.g. [../../src/stages/process.ts](../../src/stages/process.ts))
before acting on a claim here.
