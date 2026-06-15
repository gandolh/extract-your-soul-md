# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies. Requires **Node ≥ 24** (uses the built-in `node:sqlite`).
- `npm run dev` — run the **web platform** in development: Fastify API (`tsx watch`, http://127.0.0.1:4317) + Vite dev server (http://localhost:5173, proxies `/api` → Fastify). Open the Vite URL. This is the primary way to work on the app.
- `npm run dev:api` / `npm run dev:web` — run just one side.
- `npm run build` — `tsc` → `dist/` (backend) then `vite build` → `dist/public/` (SPA). No collision.
- `npm run serve:prod` — run the compiled server (`dist/index.js --serve`). Serves both the SPA (static, from `dist/public`) and the API on one port (4317). Sets `--no-warnings=ExperimentalWarning` for `node:sqlite`.
- `npm run start` — the **CLI data-prep pipeline** (no LLM, no server): process → chunk. Produces `chunks/` + `chunks/manifest.json` from `inputs/freeform/` and `inputs/questionnaire/answers.md`. Still used by the Claude `/extract-soul` path.
- `npm run start -- --interview` — the interactive REPL questionnaire (writes `inputs/questionnaire/answers.md`). `--en` for English-primary.
- `npm run start -- --ollama` — CLI pipeline + local Ollama map/reduce → `out/my-soul.md`.

No test runner or linter is configured.

## Two faces of this repo

This project now has **two front doors over a shared core**:

1. **The web platform** (`npm run dev` / `serve:prod`) — a multi-user React SPA + Fastify API + SQLite, where users register, answer themed *studies*, import conversations, and generate a per-user `soul.md`. **SQLite (`data/soul.sqlite`) is the source of truth.** This is the main product surface.
2. **The CLI pipeline** (`npm run start [-- --interview|--ollama]`) — the original single-user, file-based data-prep + extraction, unchanged. The Claude `/extract-soul` skill still operates on repo-root `chunks/`.

The web platform *reuses the CLI's pipeline code unchanged* — it just generates the file-based inputs on demand from DB rows at extraction time (see "Per-user extraction" below).

## Big-picture architecture

The CLI is **pure data prep** by default — it does not call an LLM. There are two input sources, two pipeline stages, then two alternative extraction paths.

### Input sources

- `inputs/freeform/` — raw WhatsApp exports (.txt / .md).
- `inputs/questionnaire/answers.md` — optional 10-question interview filled in via either the `--interview` REPL or the `--web` form. Both produce byte-identical files (same `## Qn — Title` headers, same `[skipped]` marker).

Either source alone is sufficient; both can be combined. See the project **corpus** (`corpus/`) for the research and design behind the questionnaire path — including `corpus/wiki/`, an LLM Wiki that compiles that research into interlinked pages (start at `corpus/wiki/overview.md`; `corpus/CLAUDE.md` is the corpus schema, including the research-wiki ingest/query/lint workflows). The raw design docs live in `corpus/wiki/sources-raw/`. The corpus also tracks engineering work (todos → briefs → done + log) — see `corpus/index.md`.

### Stage 1 — `src/stages/process.ts`
Parses WhatsApp exports from `inputs/freeform/`, filters to messages authored by the user (matched against names in `inputs/my-names.txt`, loaded by `src/config.ts`), drops noise (short messages, URLs, `<Media omitted>`, exact-match duplicates), and writes per-source files into `inputs/processed/`. The "your messages only" filter is load-bearing — other speakers' words must not pollute the voice profile. Then `processQuestionnaire` reads `inputs/questionnaire/answers.md` if present, parses `## Qn — Title` sections, drops skipped answers, and writes `inputs/processed/__questionnaire__.txt` with a `# QUESTIONNAIRE` marker header.

### Stage 2 — `src/stages/chunk.ts`
File-bounded first-fit packing of processed messages into token-budgeted chunks (`CHUNK_TARGET_TOKENS`, default 30k) under `chunks/chunk-NNN.txt`, plus `chunks/manifest.json` recording ordering, sources, token estimates, and a `kind` field per chunk (`freeform` or `questionnaire`). The questionnaire file is always isolated into its own chunk (never packed with chat fragments) so the extractor can apply the Q&A-flavored prompt without cross-contamination. Token estimation uses the cheap ~4 chars/token heuristic in `src/tokens.ts` (tuned for Romanian/English).

### Stage 0 — questionnaire capture (CLI: `--interview`)
`src/stages/interview.ts` (`--interview`) — a Node `readline` REPL that walks through the 10+1 questions defined in `src/questions.ts`, writing `inputs/questionnaire/answers.md` via the shared `src/answers-file.ts` module (the single source of truth for the file format — header, `## Qn — Title` sections, `[skipped]` marker; the downstream parser in `process.ts` keys off the same regex). Multi-line answers, `:skip` / `:back` / `:quit` / `:help`, crash-safe append, resume on re-run. (The old vanilla `--web` form has been replaced by the web platform below; `--web` is now an alias for `--serve`.)

No LLM calls in the REPL — questionnaire capture is intentionally dumb; all interpretation happens at extract time.

### Extraction — two paths, same map/reduce shape
The chunks are designed for a **map/reduce** flow with prompts defined in `src/prompts.ts` (`MAP_PROMPT_HEADER`, `MAP_PROMPT_HEADER_QA`, and `REDUCE_PROMPT_HEADER`). The chat-log map prompt extracts vocabulary, tone, and stylistic patterns; the Q&A map prompt extracts propositional content (beliefs, motivations, narrative arcs) AND voice features from the explanatory prose of the answers. Map produces ~200 tokens of voice bullets per chunk; reduce synthesizes all bullets into the final profile with conditional sections (`Core Motivation & Fears`, `Communication Style`, `Self-Perception vs. Observed Voice`) that only appear if the questionnaire batches supplied material for them.

- **Path A (primary): Claude Code orchestration.** After the CLI emits `chunks/`, a Claude Code session reads `chunks/manifest.json`, fans out one parallel `soul-chunk-extractor` sub-agent per chunk (the agent reads the chunk's `# Kind:` header and picks the right output shape), then synthesizes all returned bullets into `out/my-soul.md`. If `out/my-soul.md` already exists, the skill backs it up to `out/my-soul.prev.md` before overwriting. `src/index.ts` prints these instructions on exit when neither `--ollama` nor `--interview` is passed.
- **Path B (fallback): local Ollama.** `src/stages/extract.ts` + `src/ollama.ts` implement the same map/reduce against a local Ollama server. The extractor picks `MAP_PROMPT_HEADER_QA` or `MAP_PROMPT_HEADER` per chunk based on the manifest's `kind` field. Per-chunk results are cached by content hash (including the kind) under `.cache/bullets/`, so re-runs after adding new exports only process new chunks. Backs up an existing `out/my-soul.md` to `out/my-soul.prev.md` before overwriting.

### Config
`src/config.ts` loads `.env` and validates with zod. All paths, chunk size, noise thresholds, Ollama settings, plus the web-platform additions (`dbPath`, `workDir`, `serverPort`, `sessionSecret`) are env-driven (see `.env.example`). `loadMyNames` reads `inputs/my-names.txt` (CLI only); the web platform stores per-user names in SQLite instead.

## Web platform architecture (`src/server/`, `src/db/`, `frontend/`)

A React+Vite SPA + Fastify API + SQLite, layered **over the unchanged CLI core**. Multi-user; SQLite is the source of truth.

- **`src/db/`** — `schema.sql` (applied idempotently on boot, WAL), `db.ts` (`node:sqlite` singleton; resolves `schema.sql` next to the module or falls back to `src/db/`), `repos.ts` (synchronous prepared-statement DAL). Tables: `users`, `sessions`, `study_answers` (PK `(user_id, question_id)`), `conversations`, `user_names`, `results`. `repos.ts` reuses `RecordedAnswer` from `answers-file.ts` so answers round-trip with no translation.
- **`src/studies.ts`** — a *presentation layer* over `QUESTIONS`. `STUDIES` groups the canonical Q1..Q11 into themed forms (`inner-world`, `how-you-tell-it`, `how-you-see-yourself`). **Adding a new study is data-only**: append `Q12+` to `src/questions.ts` and a `Study` entry here. Adds no new file-format surface — the `Q\d+` regex already accepts higher ids.
- **`src/server/`** — `app.ts` builds Fastify (cookie plugin, 4 route groups, prod static SPA + history fallback), `serve.ts` listens, `auth.ts` (scrypt hashing + opaque session tokens in a signed `sid` cookie + `requireAuth` preHandler), `pipeline.ts` (per-user extraction), `routes/{auth,studies,conversations,results}.ts`.
- **`frontend/`** — own Vite root + own `tsconfig.json` (DOM lib + `react-jsx` + Bundler resolution — kept separate from the backend's NodeNext tsconfig). Base UI (`@base-ui-components/react`), `react-router-dom`. Pages: Login/Register, Intro (`/`), Studies index + StudyPage, Import (conversations + names), Results (renders `soul.md`, runs extraction). `vite.config.ts` proxies `/api`→4317 in dev; `vite build`→`dist/public` for prod.

### Per-user extraction (`src/server/pipeline.ts`)
`POST /api/extract` → `runUserExtraction(cfg, userId)`: makes a throwaway work dir under `WORK_DIR`, clones `Config` with all paths pointed into it (absolute), writes the user's conversations to `work/freeform/` and their answers to `work/questionnaire/answers.md` **via the unchanged `writeAnswersFile`**, then runs the unchanged `processAll → chunkAll → runOllamaPipeline`, reads the result back into the `results` table (carrying the prior `soul_md` into `prev_md`), and deletes the work dir. **The programmatic extractor is always Ollama** — the Claude `/extract-soul` agent path can't run from inside an HTTP request, so it stays CLI-only. Guards: 400 if the user has no answers and no conversations; 409 if an extraction is already running for that user (in-memory lock).

### Privacy boundary
Everything under `inputs/`, `inputs/processed/`, `chunks/`, `.cache/`, `out/`, plus the web platform's `data/` (SQLite) and `.work/` (per-user scratch) is gitignored. `soul.md` is meant for manual review before downstream use — the safety net against verbatim regurgitation by the LLM.

### Downstream consumers
`out/my-soul.md` is the only artifact other tools depend on. Keep the artifact stable; swap extraction strategies freely.

## Honest limitations

- The web platform's extraction is **Ollama-only** (a local Ollama server must be running). The higher-quality Claude `/extract-soul` path requires a Claude Code session and stays CLI-only.
- `node:sqlite` is experimental (Node ≥ 24); the server suppresses the warning. Migrating to `better-sqlite3` later is mechanical (same API surface).
- `@base-ui-components/react` is pre-1.0 (pinned to an exact RC); its API may shift.
- Auth is pragmatic (username/password, scrypt, cookie sessions). Set a real `SESSION_SECRET` and run behind TLS for any non-local deployment.
- `/api/extract` is synchronous — an Ollama run can take minutes (Fastify `requestTimeout` is raised to accommodate it). A job queue + polling is the obvious next step.
- LLM stochasticity → runs are not reproducible. WhatsApp-only parsers (`src/stages/process.ts`). Token estimator tuned for Romanian/English.
