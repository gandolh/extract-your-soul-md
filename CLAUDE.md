# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies. Requires **Node ≥ 24** (uses the built-in `node:sqlite`).
- `npm run dev` — run the **web platform** in development: Fastify API (`tsx watch src/index.ts --port=4317`, http://127.0.0.1:4317) + Vite dev server (http://localhost:5173, proxies `/api` → Fastify). Open the Vite URL. This is the primary way to work on the app.
- `npm run dev:api` / `npm run dev:web` — run just one side.
- `npm run build` — `build:server` (`tsc -p tsconfig.json` → `dist/`, backend) then `build:web` (`vite build` → `dist/public/`, SPA). No collision.
- `npm run build:server` / `npm run build:web` — run just one build half.
- `npm run serve:prod` — run the compiled server (`node --no-warnings=ExperimentalWarning dist/index.js --port=4317`). Serves both the SPA (static, from `dist/public`) and the API on one port (4317). The warning flag is for `node:sqlite`.
- `npm run typecheck:web` — type-check the frontend (`tsc -p frontend/tsconfig.json --noEmit`).

No test runner or linter is configured. **There is no CLI** — `src/index.ts` is the single entry point and only ever starts the server.

## One surface: API + frontend

This project is **API + frontend only** — a multi-user React SPA + Fastify API + SQLite, where users register, answer themed *studies*, import conversations, and generate a per-user `soul.md`. **SQLite (`data/soul.sqlite`) is the source of truth.**

There is no command-line data-prep tool and no Claude `/extract-soul` skill. The data-prep + extraction pipeline still exists (`src/stages/`, `src/ollama.ts`) but is reachable **only** from the server — `src/server/pipeline.ts` invokes it against a per-user throwaway work dir built from SQLite rows at extraction time (see "Per-user extraction" below).

## Big-picture architecture

`src/index.ts` is a thin server entry: it loads config, parses an optional `--port=`, and calls `runServe`. Nothing else. The shared pipeline below is **pure data prep** — it does not call an LLM until the extraction stage. There are two input sources, two pipeline stages, then one Ollama extraction step.

### Input sources

- `freeform/` (per-user work dir) — raw WhatsApp exports (.txt / .md), materialized from the user's `conversations` rows.
- `questionnaire/answers.md` (per-user work dir) — the studies answers, materialized from the user's `study_answers` rows via the shared `writeAnswersFile` (same `## Qn — Title` headers, same `[skipped]` marker as the parser keys off).

Either source alone is sufficient; both can be combined. See the project **corpus** (`corpus/`) for the research and design behind the questionnaire path — including `corpus/wiki/`, an LLM Wiki that compiles that research into interlinked pages (start at `corpus/wiki/overview.md`; `corpus/CLAUDE.md` is the corpus schema, including the research-wiki ingest/query/lint workflows). The raw design docs live in `corpus/wiki/sources-raw/`. The corpus also tracks engineering work (todos → briefs → done + log) — see `corpus/index.md`.

### Stage 0 — questionnaire capture (the studies forms)
Questionnaire capture is the **web studies forms** in the React SPA (Studies index + StudyPage). The 10+1 canonical questions live in `src/questions.ts`; `src/studies.ts` groups them into themed forms (see below). Answers are stored in the `study_answers` table and, at extraction time, written to `questionnaire/answers.md` via the shared `src/answers-file.ts` module — the single source of truth for the file format (header, `## Qn — Title` sections, `[skipped]` marker; the downstream parser in `process.ts` keys off the same `Q\d+` regex). The `answers.md` format contract is load-bearing — `repos.ts`, `answers-file.ts`, and `process.ts` all agree on it. Capture is intentionally dumb: no LLM, all interpretation happens at extract time.

### Stage 1 — `src/stages/process.ts`
Parses WhatsApp exports from `freeform/`, filters to messages authored by the user (matched against the user's **per-user display names from the DB** — `user_names` table via `getNames(userId)`, materialized into the work dir), drops noise (short messages, URLs, `<Media omitted>`, exact-match duplicates), and writes per-source files into `processed/`. The "your messages only" filter is load-bearing — other speakers' words must not pollute the voice profile. Then `processQuestionnaire` reads `questionnaire/answers.md` if present, parses `## Qn — Title` sections, drops skipped answers, and writes `processed/__questionnaire__.txt` with a `# QUESTIONNAIRE` marker header.

### Stage 2 — `src/stages/chunk.ts`
File-bounded first-fit packing of processed messages into token-budgeted chunks under `chunks/chunk-NNN.txt`, plus `chunks/manifest.json` recording ordering, sources, token estimates, and a `kind` field per chunk (`freeform` or `questionnaire`). The packing budget is **derived from `OLLAMA_NUM_CTX`** (minus header/output reserves) rather than blindly using `CHUNK_TARGET_TOKENS`, so chunks actually fit the map call — Ollama silently truncates anything past `num_ctx`. With the default 8192 ctx this clamps the ~30k target down to ~7080 tokens (it logs when it clamps). The questionnaire file is always isolated into its own chunk (never packed with chat fragments) so the extractor can apply the Q&A-flavored prompt without cross-contamination. Token estimation uses the cheap ~4 chars/token heuristic in `src/tokens.ts` (tuned for Romanian/English).

### Extraction — Ollama map/reduce
The chunks are designed for a **map/reduce** flow with prompts defined in `src/prompts.ts` (`MAP_PROMPT_HEADER`, `MAP_PROMPT_HEADER_QA`, and `REDUCE_PROMPT_HEADER`). The chat-log map prompt extracts vocabulary, tone, and stylistic patterns; the Q&A map prompt extracts propositional content (beliefs, motivations, narrative arcs) AND voice features from the explanatory prose of the answers. Map produces ~200 tokens of voice bullets per chunk; reduce synthesizes all bullets into the final profile with conditional sections (`Core Motivation & Fears`, `Communication Style`, `Self-Perception vs. Observed Voice`) that only appear if the questionnaire batches supplied material for them.

`src/stages/extract.ts` + `src/ollama.ts` implement the map/reduce against a local Ollama server. The extractor picks `MAP_PROMPT_HEADER_QA` or `MAP_PROMPT_HEADER` per chunk based on the manifest's `kind` field. Per-chunk map results are cached under `.cache/bullets/`, fingerprinted by **kind + model + context window + temperature + prompt-header hash + content** — so any of those changing invalidates the cache, and re-runs after adding new exports only process new chunks. Extraction is **deterministic**: temperature defaults to 0 and a fixed seed (`EXTRACTION_SEED`) is passed to Ollama, so a prompt edit's effect is visible without stochastic noise.

### Config
`src/config.ts` loads `.env` and validates with zod. All paths, chunk size, noise thresholds, Ollama settings (model, `OLLAMA_NUM_CTX`, temperature), plus the web-platform settings (`dbPath`, `workDir`, `serverPort`, `sessionSecret`) are env-driven (see `.env.example`). Per-user "you" display names are stored in SQLite (`user_names`), not a file.

## Web platform architecture (`src/server/`, `src/db/`, `frontend/`)

A React+Vite SPA + Fastify API + SQLite. Multi-user; SQLite is the source of truth.

- **`src/db/`** — `schema.sql` (applied idempotently on boot, WAL), `db.ts` (`node:sqlite` singleton; resolves `schema.sql` next to the module or falls back to `src/db/`), `repos.ts` (synchronous prepared-statement DAL). Tables: `users`, `sessions`, `study_answers` (PK `(user_id, question_id)`), `conversations`, `user_names`, `results`. `repos.ts` reuses `RecordedAnswer` from `answers-file.ts` so answers round-trip with no translation.
- **`src/studies.ts`** — a *presentation layer* over `QUESTIONS`. `STUDIES` groups the canonical Q1..Q11 into themed forms (`inner-world`, `how-you-tell-it`, `how-you-see-yourself`). **Adding a new study is data-only**: append `Q12+` to `src/questions.ts` and a `Study` entry here. Adds no new file-format surface — the `Q\d+` regex already accepts higher ids.
- **`src/server/`** — `app.ts` builds Fastify (cookie plugin, 4 route groups, prod static SPA + history fallback), `serve.ts` listens, `auth.ts` (scrypt hashing + opaque session tokens in a signed `sid` cookie + `requireAuth` preHandler), `pipeline.ts` (per-user extraction), `routes/{auth,studies,conversations,results}.ts`.
- **`frontend/`** — own Vite root + own `tsconfig.json` (DOM lib + `react-jsx` + Bundler resolution — kept separate from the backend's NodeNext tsconfig). Base UI (`@base-ui-components/react`), `react-router-dom`. Pages: Login/Register, Intro (`/`), Studies index + StudyPage, Import (conversations + names), Results (renders `soul.md`, runs extraction). `vite.config.ts` proxies `/api`→4317 in dev; `vite build`→`dist/public` for prod.

### Per-user extraction (`src/server/pipeline.ts`)
`POST /api/extract` → `runUserExtraction(cfg, userId)`: makes a throwaway work dir under `WORK_DIR`, clones `Config` with all paths pointed into it (absolute), writes the user's conversations to `work/freeform/` and their answers to `work/questionnaire/answers.md` **via `writeAnswersFile`**, then runs the shared `processAll → chunkAll → runOllamaPipeline` (using the user's `getNames(userId)` as the "you" filter), reads the result back into the `results` table (carrying the prior `soul_md` into `prev_md`), and deletes the work dir. Extraction is **always Ollama** — it's the only extraction path. Guards: 400 if the user has no answers and no conversations; 409 if an extraction is already running for that user (in-memory lock).

### Privacy boundary
Everything under the per-user `WORK_DIR` scratch (`freeform/`, `processed/`, `chunks/`), `.cache/`, `out/`, plus the web platform's `data/` (SQLite) is gitignored. `soul.md` is meant for manual review before downstream use — the safety net against verbatim regurgitation by the LLM.

### Downstream consumers
The generated `soul.md` (stored in the `results` table, surfaced via `/api/results`) is the only artifact other tools depend on. Keep the artifact stable; swap extraction strategies freely.

## Honest limitations

- Extraction is **Ollama-only** — Ollama (local server or the configured cloud host) must be reachable. It is the single extraction path. A preflight (`pingOllama`) checks reachability/model before any work and fails fast with a friendly reason; `generate()` has a per-request timeout (`OLLAMA_TIMEOUT_MS`) + retry-with-backoff; `GET /api/results` exposes `ollamaReady` so the UI gates the Generate button.
- `node:sqlite` is experimental (Node ≥ 24); the server suppresses the warning. Migrating to `better-sqlite3` later is mechanical (same API surface).
- `@base-ui-components/react` is pre-1.0 (pinned to an exact RC); its API may shift.
- Auth is pragmatic (username/password, scrypt, cookie sessions). Run behind TLS for any non-local deployment (prod sets `secure` cookies). The server **refuses to boot in production** if `SESSION_SECRET` is still the dev default (warns in dev) — set a real one (`openssl rand -hex 32`). Register returns a generic conflict message (no user enumeration); expired sessions are swept on boot + hourly. Auth/extract rate-limiting is still **not** implemented (deferred; gated on a real public deploy).
- `/api/extract` is an **async persisted job**: the route inserts a `jobs` row (a partial-unique-index per-user lock that survives restarts), returns `202 + jobId`, and runs the pipeline via `setImmediate`. The client polls `GET /api/results` (which carries a `job` block — status/stage/chunk progress) or `GET /api/extract/:jobId`. Crashed jobs are reclaimed on boot (`reclaimStaleJobs` → failed + orphaned work-dir removed). Single-process `setImmediate`, not an external queue — matches the local-Ollama single-box reality.
- LLM stochasticity → outputs can still drift across model/prompt changes (the fixed seed + temperature 0 only make a *given* config reproducible). WhatsApp-only parsers (`src/stages/process.ts`). Token estimator tuned for Romanian/English.
