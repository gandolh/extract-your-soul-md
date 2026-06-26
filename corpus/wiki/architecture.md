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

- **`process.ts`** — **questionnaire-only**. Parses `questionnaire/answers.md`
  (`## Qn — Title` sections, incl. the reserved `## Q900` confirmed-swipe block),
  drops skipped answers → `processed/__questionnaire__.txt`. The old WhatsApp
  parser + "your messages only" voice filter were removed with the conversations
  feature (2026-06-22).
- **`chunk.ts`** — file-bounded first-fit packing into token-budgeted chunks +
  `manifest.json` (records ordering, sources, `kind: questionnaire | freeform`).
  The budget is derived from `OLLAMA_NUM_CTX` so chunks fit the map call. Only the
  questionnaire file is produced today, so chunks are `questionnaire`-kind
  (`freeform` is dormant packing infrastructure).
- **`extract.ts`** + **`ollama.ts`** — the Ollama map/reduce path, with per-chunk
  caching under `.cache/bullets/` (keyed on kind + model + ctx + temp + prompt +
  content). Deterministic: temperature 0 + fixed seed.

Shared helpers: `config.ts` (zod-validated env), `questions.ts` (the question
data), `prompts.ts` (map/reduce prompt headers, incl. the Q&A variant),
`answers-file.ts` (the single source of truth for the `answers.md` format),
`tokens.ts` (UTF-8-byte / 4 estimator), `studies.ts` (presentation layer grouping
questions into themed web studies), `scoring.ts` (choice→trait report scoring),
`color.ts`. Plus **`stats/conversation-stats.ts`** — a standalone, no-LLM
conversation analyzer (parser + aggregation), unrelated to the soul pipeline.

## Web platform

- **`src/db/`** — `schema.sql` (idempotent, WAL), `db.ts` (`node:sqlite`
  singleton), `repos.ts` (synchronous prepared-statement DAL). Tables: `users`,
  `sessions`, `study_answers`, `reports` (scored trait profiles), `swipe_cards`,
  `saved_stats` (saved conversation statistics — the transcript is never stored),
  `results`, `jobs` (the extraction job lock). The old `conversations` /
  `user_names` tables are gone.
- **`src/server/`** — `app.ts` (Fastify wiring), `serve.ts` (listen), `auth.ts`
  (scrypt + cookie sessions), `pipeline.ts` (per-user extraction), `swipe.ts`
  (card generation), `ollama-ready.ts` (TTL-cached readiness ping), `routes/`
  (`auth`, `studies`, `swipe`, `stats`, `results`).
- **`frontend/`** — own Vite root + tsconfig (DOM + react-jsx). Base UI
  (`@base-ui-components/react`), `react-router-dom`, TanStack Query. Pages: Login/
  Register, Intro, Studies + StudyPage, Answers, Cards (`SwipePage`), Analyze
  (`StatsPage`), Saved (`SavedStatsPage`), Profile (`ResultsPage`). Proxies
  `/api`→4317 in dev.

### Per-user extraction (`src/server/pipeline.ts`)
`POST /api/extract` is an **async persisted job**: it inserts a `jobs` row
(partial-unique-index per-user lock that survives restarts), returns 202 + jobId,
and runs via `setImmediate`. The job clones `Config` into a throwaway work dir,
writes the user's answers via `writeAnswersFile` + appends confirmed swipe
statements via `appendConfirmedStatements`, runs `processAll → chunkAll →
runOllamaPipeline`, reads the result into the `results` table (carrying prior
`soul_md` into `prev_md`), and deletes the work dir. The client polls
`GET /api/results` (or `/api/extract/:jobId`) for stage/chunk progress. Extraction
is **always Ollama** — the only extraction path.

### Conversation statistics (`src/stats/`, `src/server/routes/stats.ts`)
A separate, **no-LLM, transient** flow. `POST /api/stats/compute` takes a pasted
chat export, parses + reduces it to aggregate numbers
(`analyzeConversation` → `ConversationStats`), and returns them — **the transcript
is never persisted**. `POST /api/stats/save` stores only the derived JSON in the
`saved_stats` table under a user-given name (default `<index>-<YYYY-MM-DD>`);
`GET /api/stats` + `/api/stats/:id` list and read saved results. Does not touch
the pipeline, Ollama, or `soul.md`.

## The output contract

The generated `soul.md`, stored in the `results` table and surfaced via
`/api/results`, is the only artifact downstream tools depend on. Keep it stable;
swap extraction strategies freely. The prior version is carried into `prev_md` on
each overwrite. (The old `out/my-soul.md` file path belonged to the removed CLI.)

## Code references

Paths above are relative to the repo root. They drift — verify a path or symbol
(`../../src/...`, e.g. [../../src/stages/process.ts](../../src/stages/process.ts))
before acting on a claim here.
