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
- `npm test` — run the `node --test` suite (`src/**/*.test.ts` via tsx); `npm run typecheck:test` type-checks the tests. No linter is configured.

**There is no CLI** — `src/index.ts` is the single entry point and only ever starts the server.

## One surface: API + frontend

This project is **API + frontend only** — a multi-user React SPA + Fastify API + SQLite, where users register, answer themed *studies*, swipe a generated "does this sound like you?" card deck, and generate a per-user `soul.md`. **SQLite (`data/soul.sqlite`) is the source of truth.** (There is **no** conversation/WhatsApp import and **no** eval harness — both were removed; the only input source is now the questionnaire.)

There is no command-line data-prep tool and no Claude `/extract-soul` skill. The data-prep + extraction pipeline still exists (`src/stages/`, `src/ollama.ts`) but is reachable **only** from the server — `src/server/pipeline.ts` invokes it against a per-user throwaway work dir built from SQLite rows at extraction time (see "Per-user extraction" below).

## Big-picture architecture

`src/index.ts` is a thin server entry: it loads config, parses an optional `--port=`, and calls `runServe`. Nothing else. The shared pipeline below is **pure data prep** — it does not call an LLM until the extraction stage. There is one input source, two pipeline stages, then one Ollama extraction step.

### Input source

- `questionnaire/answers.md` (per-user work dir) — the studies answers, materialized from the user's `study_answers` rows via the shared `writeAnswersFile` (same `## Qn — Title` headers, same `[skipped]` marker as the parser keys off). The swipe-card statements the user confirmed are then appended to the **same file** as one reserved `## Q900 — …` section (via `appendConfirmedStatements`), so they ride the same questionnaire chunk with no new file-format surface.

See the project **corpus** (`corpus/`) for the research and design behind the questionnaire path — including `corpus/wiki/`, an LLM Wiki that compiles that research into interlinked pages (start at `corpus/wiki/overview.md`; `corpus/CLAUDE.md` is the corpus schema, including the research-wiki ingest/query/lint workflows). The raw design docs live in `corpus/wiki/sources-raw/`. The corpus also tracks engineering work (todos → briefs → done + log) — see `corpus/index.md`.

### Stage 0 — questionnaire capture (the studies forms)
Questionnaire capture is the **web studies forms** in the React SPA (Studies index + StudyPage). The canonical questions (Q1..Q89 today: free-text voice prompts + choice/trait items) live in `src/questions.ts`; `src/studies.ts` groups them into themed forms (see below). Answers are stored in the `study_answers` table and, at extraction time, written to `questionnaire/answers.md` via the shared `src/answers-file.ts` module — the single source of truth for the file format (header, `## Qn — Title` sections, `[skipped]` marker; the downstream parser in `process.ts` keys off the same `Q\d+` regex). The `answers.md` format contract is load-bearing — `repos.ts`, `answers-file.ts`, and `process.ts` all agree on it. Capture is intentionally dumb: no LLM, all interpretation happens at extract time.

### Stage 0.5 — swipe cards ("does this sound like you?")
A Tinder-style refinement loop on top of the studies. `POST /api/swipe/generate` (`src/server/swipe.ts`) feeds the user's **own** material — their study answers (free-text + choice notes), their opted-in scored trait profile (`buildProfileText`), and any prior `soul.md` — to Ollama (prompt `SWIPE_CARD_PROMPT_HEADER`, higher temperature + a random seed for variety) and parses the response into short first-person statements stored in the `swipe_cards` table. The user swipes each one yes ("sounds like me") / no in the React `SwipePage`; verdicts persist via `POST /api/swipe/:id/verdict`. At extraction time the **confirmed ('yes') statements** are folded into `answers.md` as the reserved `## Q900` section. This is the only place capture touches an LLM — generation is gated on `ollamaReady` and on the user having at least one answer.

### Stage 1 — `src/stages/process.ts`
`processQuestionnaire` reads `questionnaire/answers.md`, parses `## Qn — Title` sections (including the reserved `## Q900` confirmed-statements block), drops skipped answers, and writes `processed/__questionnaire__.txt` with a `# QUESTIONNAIRE` marker header. `processAll(cfg)` runs only this step and throws if there is nothing to process. (The old WhatsApp/freeform parser + the "your messages only" voice filter were removed along with the conversations feature.)

### Stage 2 — `src/stages/chunk.ts`
File-bounded first-fit packing of processed files into token-budgeted chunks under `chunks/chunk-NNN.txt`, plus `chunks/manifest.json` recording ordering, sources, token estimates, and a `kind` field per chunk. Only the questionnaire file is produced today, so chunks are `questionnaire`-kind (the `freeform` kind in the `ChunkKind` union is dormant generic-packing infrastructure). The packing budget is **derived from `OLLAMA_NUM_CTX`** (minus header/output reserves) rather than blindly using `CHUNK_TARGET_TOKENS`, so chunks actually fit the map call — Ollama silently truncates anything past `num_ctx`. With the default 8192 ctx this clamps the ~30k target down to ~7080 tokens (it logs when it clamps). Token estimation uses the cheap ~4 bytes/token heuristic in `src/tokens.ts`.

### Extraction — Ollama map/reduce
The chunks are designed for a **map/reduce** flow with prompts defined in `src/prompts.ts` (`MAP_PROMPT_HEADER`, `MAP_PROMPT_HEADER_QA`, and `REDUCE_PROMPT_HEADER`). The chat-log map prompt extracts vocabulary, tone, and stylistic patterns; the Q&A map prompt extracts propositional content (beliefs, motivations, narrative arcs) AND voice features from the explanatory prose of the answers. Map produces ~200 tokens of voice bullets per chunk; reduce synthesizes all bullets into the final profile with conditional sections (`Core Motivation & Fears`, `Communication Style`, `Self-Perception vs. Observed Voice`) that only appear if the questionnaire batches supplied material for them.

`src/stages/extract.ts` + `src/ollama.ts` implement the map/reduce against a local Ollama server. The extractor picks `MAP_PROMPT_HEADER_QA` or `MAP_PROMPT_HEADER` per chunk based on the manifest's `kind` field. Per-chunk map results are cached under `.cache/bullets/`, fingerprinted by **kind + model + context window + temperature + prompt-header hash + content** — so any of those changing invalidates the cache, and re-runs after adding new exports only process new chunks. Extraction is **deterministic**: temperature defaults to 0 and a fixed seed (`EXTRACTION_SEED`) is passed to Ollama, so a prompt edit's effect is visible without stochastic noise.

### Config
`src/config.ts` loads `.env` and validates with zod. All paths, chunk size, Ollama settings (model, `OLLAMA_NUM_CTX`, temperature, timeout), plus the web-platform settings (`dbPath`, `workDir`, `serverPort`, `sessionSecret`) are env-driven (see `.env.example`).

## Web platform architecture (`src/server/`, `src/db/`, `frontend/`)

A React+Vite SPA + Fastify API + SQLite. Multi-user; SQLite is the source of truth.

- **`src/db/`** — `schema.sql` (applied idempotently on boot, WAL), `db.ts` (`node:sqlite` singleton; resolves `schema.sql` next to the module or falls back to `src/db/`), `repos.ts` (synchronous prepared-statement DAL). Tables: `users`, `sessions`, `study_answers` (PK `(user_id, question_id)`), `reports`, `swipe_cards` (`UNIQUE(user_id, statement)`), `results`, `jobs`. `repos.ts` reuses `RecordedAnswer` from `answers-file.ts` so answers round-trip with no translation.
- **`src/studies.ts`** — a *presentation layer* over `QUESTIONS`. `STUDIES` groups the canonical questions into themed forms (voice + profile bands). **Adding a new study is data-only**: append questions to `src/questions.ts` and a `Study` entry here. Adds no new file-format surface — the `Q\d+` regex already accepts higher ids.
- **`src/server/`** — `app.ts` builds Fastify (cookie plugin, 4 route groups, prod static SPA + history fallback), `serve.ts` listens, `auth.ts` (scrypt hashing + opaque session tokens in a signed `sid` cookie + `requireAuth` preHandler), `pipeline.ts` (per-user extraction), `swipe.ts` (card generation), `ollama-ready.ts` (shared TTL-cached readiness ping), `routes/{auth,studies,swipe,results}.ts`.
- **`frontend/`** — own Vite root + own `tsconfig.json` (DOM lib + `react-jsx` + Bundler resolution — kept separate from the backend's NodeNext tsconfig). Base UI (`@base-ui-components/react`), `react-router-dom`. Pages: Login/Register, Intro (`/`), Studies index + StudyPage, Cards (`SwipePage` — the swipe deck), Results (renders `soul.md`, runs extraction). `vite.config.ts` proxies `/api`→4317 in dev; `vite build`→`dist/public` for prod.

### Per-user extraction (`src/server/pipeline.ts`)
`POST /api/extract` → `runUserExtraction(cfg, userId)`: makes a throwaway work dir under `WORK_DIR`, clones `Config` with all paths pointed into it (absolute), writes the user's answers to `work/questionnaire/answers.md` **via `writeAnswersFile`** then appends their confirmed swipe statements via `appendConfirmedStatements`, runs the shared `processAll → chunkAll → runOllamaPipeline`, reads the result back into the `results` table (carrying the prior `soul_md` into `prev_md`), and deletes the work dir. Extraction is **always Ollama** — it's the only extraction path. Guards: 400 if the user has no study answers; 409 if an extraction is already running (DB-level job lock).

### Privacy boundary
Everything under the per-user `WORK_DIR` scratch (`processed/`, `chunks/`), `.cache/`, `out/`, plus the web platform's `data/` (SQLite) is gitignored. `soul.md` is meant for manual review before downstream use — the safety net against verbatim regurgitation by the LLM.

### Downstream consumers
The generated `soul.md` (stored in the `results` table, surfaced via `/api/results`) is the only artifact other tools depend on. Keep the artifact stable; swap extraction strategies freely.

## Honest limitations

- Extraction is **Ollama-only** — Ollama (local server or the configured cloud host) must be reachable. It is the single extraction path. A preflight (`pingOllama`) checks reachability/model before any work and fails fast with a friendly reason; `generate()` has a per-request timeout (`OLLAMA_TIMEOUT_MS`) + retry-with-backoff; `GET /api/results` exposes `ollamaReady` so the UI gates the Generate button.
- `node:sqlite` is experimental (Node ≥ 24); the server suppresses the warning. Migrating to `better-sqlite3` later is mechanical (same API surface).
- `@base-ui-components/react` is pre-1.0 (pinned to an exact RC); its API may shift.
- Auth is pragmatic (username/password, scrypt, cookie sessions). Run behind TLS for any non-local deployment (prod sets `secure` cookies). The server **refuses to boot in production** if `SESSION_SECRET` is still the dev default (warns in dev) — set a real one (`openssl rand -hex 32`). Register returns a generic conflict message (no user enumeration); expired sessions are swept on boot + hourly. Auth/extract rate-limiting is still **not** implemented (deferred; gated on a real public deploy).
- `/api/extract` is an **async persisted job**: the route inserts a `jobs` row (a partial-unique-index per-user lock that survives restarts), returns `202 + jobId`, and runs the pipeline via `setImmediate`. The client polls `GET /api/results` (which carries a `job` block — status/stage/chunk progress) or `GET /api/extract/:jobId`. Crashed jobs are reclaimed on boot (`reclaimStaleJobs` → failed + orphaned work-dir removed). Single-process `setImmediate`, not an external queue — matches the local-Ollama single-box reality.
- Swipe-card generation also needs Ollama reachable (gated on `ollamaReady`); it runs synchronously (the client opts out of its request timeout) rather than as a persisted job, and uses a higher temperature + random seed for variety, so the deck differs across regenerations.
- LLM stochasticity → outputs can still drift across model/prompt changes (the fixed seed + temperature 0 only make a *given* extraction config reproducible). The only input source is the questionnaire (`src/stages/process.ts` is questionnaire-only).
