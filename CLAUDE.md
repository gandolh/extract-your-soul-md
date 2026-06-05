# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies.
- `npm run start` — run the CLI via `tsx` (data-prep only: process → chunk). Produces `chunks/` and `chunks/manifest.json`. Picks up `inputs/freeform/` (WhatsApp) and `inputs/questionnaire/answers.md` (interview) when present.
- `npm run start -- --interview` — launch the 10-question interactive REPL. Saves to `inputs/questionnaire/answers.md` (crash-safe, resumable via re-run). Append `--en` for English-primary prompts (default is Romanian-primary).
- `npm run web` (or `npm run start -- --web`) — launch a Google-Forms-style web form (tiny Fastify server, default http://127.0.0.1:4317) that writes the **same** `inputs/questionnaire/answers.md` as the REPL. English-primary by default (`--ro` to flip; in-page toggle). Flags: `--port=N`, `--no-open`. Backs up an existing file to `answers.prev.md` on save.
- `npm run start -- --ollama` — same pipeline as `start`, then runs the local map/reduce extraction against Ollama and writes `out/my-soul.md`.
- `npm run build` — TypeScript compile to `dist/`, then copy `src/web/public/` → `dist/web/public/` (the web form's static assets).
- `npm run start:prod` — run the compiled `dist/index.js`.

No test runner or linter is configured.

## Big-picture architecture

The CLI is **pure data prep** by default — it does not call an LLM. There are two input sources, two pipeline stages, then two alternative extraction paths.

### Input sources

- `inputs/freeform/` — raw WhatsApp exports (.txt / .md).
- `inputs/questionnaire/answers.md` — optional 10-question interview filled in via either the `--interview` REPL or the `--web` form. Both produce byte-identical files (same `## Qn — Title` headers, same `[skipped]` marker).

Either source alone is sufficient; both can be combined. See `docs/` for the research and design behind the questionnaire path — including `docs/wiki/`, an LLM Wiki that compiles that research into interlinked pages (start at `docs/wiki/overview.md`; `docs/wiki/CLAUDE.md` is its maintenance schema).

### Stage 1 — `src/stages/process.ts`
Parses WhatsApp exports from `inputs/freeform/`, filters to messages authored by the user (matched against names in `inputs/my-names.txt`, loaded by `src/config.ts`), drops noise (short messages, URLs, `<Media omitted>`, exact-match duplicates), and writes per-source files into `inputs/processed/`. The "your messages only" filter is load-bearing — other speakers' words must not pollute the voice profile. Then `processQuestionnaire` reads `inputs/questionnaire/answers.md` if present, parses `## Qn — Title` sections, drops skipped answers, and writes `inputs/processed/__questionnaire__.txt` with a `# QUESTIONNAIRE` marker header.

### Stage 2 — `src/stages/chunk.ts`
File-bounded first-fit packing of processed messages into token-budgeted chunks (`CHUNK_TARGET_TOKENS`, default 30k) under `chunks/chunk-NNN.txt`, plus `chunks/manifest.json` recording ordering, sources, token estimates, and a `kind` field per chunk (`freeform` or `questionnaire`). The questionnaire file is always isolated into its own chunk (never packed with chat fragments) so the extractor can apply the Q&A-flavored prompt without cross-contamination. Token estimation uses the cheap ~4 chars/token heuristic in `src/tokens.ts` (tuned for Romanian/English).

### Stage 0 — questionnaire capture (only for `--interview` / `--web`)
Two interchangeable front-ends, both writing the same `inputs/questionnaire/answers.md` via the shared `src/answers-file.ts` module (the single source of truth for the file format — header, `## Qn — Title` sections, `[skipped]` marker; the downstream parser in `process.ts` keys off the same regex):

- `src/stages/interview.ts` (`--interview`) — a Node `readline` REPL that walks through the 10+1 questions defined in `src/questions.ts`. Multi-line answers (end on a blank line or `:done`), with `:skip` / `:back` / `:quit` / `:help` commands. Appends each answer immediately (crash-safe). On re-run, detects a partial file and offers resume from the next unanswered question.
- `src/stages/web.ts` (`--web`) — a tiny Fastify server serving a Google-Forms-style static form from `src/web/public/`. The form is data-driven from `src/questions.ts` via `GET /api/questions` (so adding/changing a question never touches the HTML), pre-fills any answers already on disk, and `POST /api/answers` writes the whole file at once (backing up an existing one to `answers.prev.md`). English-primary by default with an in-page RO/EN toggle.

No LLM calls in either front-end — questionnaire capture is intentionally dumb; all interpretation happens at extract time.

### Extraction — two paths, same map/reduce shape
The chunks are designed for a **map/reduce** flow with prompts defined in `src/prompts.ts` (`MAP_PROMPT_HEADER`, `MAP_PROMPT_HEADER_QA`, and `REDUCE_PROMPT_HEADER`). The chat-log map prompt extracts vocabulary, tone, and stylistic patterns; the Q&A map prompt extracts propositional content (beliefs, motivations, narrative arcs) AND voice features from the explanatory prose of the answers. Map produces ~200 tokens of voice bullets per chunk; reduce synthesizes all bullets into the final profile with conditional sections (`Core Motivation & Fears`, `Communication Style`, `Self-Perception vs. Observed Voice`) that only appear if the questionnaire batches supplied material for them.

- **Path A (primary): Claude Code orchestration.** After the CLI emits `chunks/`, a Claude Code session reads `chunks/manifest.json`, fans out one parallel `soul-chunk-extractor` sub-agent per chunk (the agent reads the chunk's `# Kind:` header and picks the right output shape), then synthesizes all returned bullets into `out/my-soul.md`. If `out/my-soul.md` already exists, the skill backs it up to `out/my-soul.prev.md` before overwriting. `src/index.ts` prints these instructions on exit when neither `--ollama` nor `--interview` is passed.
- **Path B (fallback): local Ollama.** `src/stages/extract.ts` + `src/ollama.ts` implement the same map/reduce against a local Ollama server. The extractor picks `MAP_PROMPT_HEADER_QA` or `MAP_PROMPT_HEADER` per chunk based on the manifest's `kind` field. Per-chunk results are cached by content hash (including the kind) under `.cache/bullets/`, so re-runs after adding new exports only process new chunks. Backs up an existing `out/my-soul.md` to `out/my-soul.prev.md` before overwriting.

### Config
`src/config.ts` loads `.env` and validates with zod. All paths, chunk size, noise thresholds, and Ollama settings are env-driven (see `.env.example`). `loadMyNames` reads `inputs/my-names.txt` (one display name per line) — the user appears under different names across chats and all aliases must be listed.

### Privacy boundary
Everything under `inputs/`, `inputs/processed/`, `chunks/`, `.cache/`, and `out/` is gitignored. `out/my-soul.md` is intentionally not auto-copied to downstream consumers — manual eyeball review is the safety net against verbatim regurgitation by the LLM.

### Downstream consumers
`out/my-soul.md` is the only artifact other tools depend on. Keep the artifact stable; swap extraction strategies freely.

## Honest limitations (from README)

- Primary path requires being inside a Claude Code session; only `--ollama` is cron-friendly.
- LLM stochasticity → runs are not reproducible.
- WhatsApp-only parsers today; new formats require new parsers in `src/stages/process.ts`.
- Token estimator is tuned for Romanian/English; other languages may need adjustment.
