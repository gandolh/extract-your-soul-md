# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies.
- `npm run start` — run the CLI via `tsx` (data-prep only: process → chunk). Produces `chunks/` and `chunks/manifest.json`.
- `npm run start -- --ollama` — same pipeline, then runs the local map/reduce extraction against Ollama and writes `out/my-soul.md`.
- `npm run build` — TypeScript compile to `dist/`.
- `npm run start:prod` — run the compiled `dist/index.js`.

No test runner or linter is configured.

## Big-picture architecture

The CLI is **pure data prep** by default — it does not call an LLM. There are two stages, then two alternative extraction paths.

### Stage 1 — `src/stages/process.ts`
Parses WhatsApp exports from `inputs/freeform/`, filters to messages authored by the user (matched against names in `inputs/my-names.txt`, loaded by `src/config.ts`), drops noise (short messages, URLs, `<Media omitted>`, exact-match duplicates), and writes per-source files into `inputs/processed/`. The "your messages only" filter is load-bearing — other speakers' words must not pollute the voice profile.

### Stage 2 — `src/stages/chunk.ts`
File-bounded first-fit packing of processed messages into token-budgeted chunks (`CHUNK_TARGET_TOKENS`, default 30k) under `chunks/chunk-NNN.txt`, plus `chunks/manifest.json` recording ordering, sources, and token estimates. Token estimation uses the cheap ~4 chars/token heuristic in `src/tokens.ts` (tuned for Romanian/English).

### Extraction — two paths, same map/reduce shape
The chunks are designed for a **map/reduce** flow with prompts defined in `src/prompts.ts` (`MAP_PROMPT_HEADER` and `REDUCE_PROMPT_HEADER`). Map produces ~200 tokens of voice bullets per chunk (~100:1 compression); reduce synthesizes all bullets into the final profile.

- **Path A (primary): Claude Code orchestration.** After the CLI emits `chunks/`, a Claude Code session reads `chunks/manifest.json`, fans out one parallel sub-agent per chunk using `MAP_PROMPT_HEADER`, then synthesizes all returned bullets with `REDUCE_PROMPT_HEADER` into `out/my-soul.md`. `src/index.ts` prints these instructions on exit when `--ollama` is not passed.
- **Path B (fallback): local Ollama.** `src/stages/extract.ts` + `src/ollama.ts` implement the same map/reduce against a local Ollama server. Per-chunk results are cached by content hash under `.cache/bullets/`, so re-runs after adding new exports only process new chunks.

### Config
`src/config.ts` loads `.env` and validates with zod. All paths, chunk size, noise thresholds, and Ollama settings are env-driven (see `.env.example`). `loadMyNames` reads `inputs/my-names.txt` (one display name per line) — the user appears under different names across chats and all aliases must be listed.

### Privacy boundary
Everything under `inputs/`, `inputs/processed/`, `chunks/`, `.cache/`, and `out/` is gitignored. `out/my-soul.md` is intentionally not auto-copied to downstream consumers — manual eyeball review is the safety net against verbatim regurgitation by the LLM.

### Downstream consumers (out of repo)
`out/my-soul.md` is the only artifact other projects depend on. Known consumers: a `newspapper` project and an `add-soul` Claude Code skill. Keep the artifact stable; swap extraction strategies freely.

## Honest limitations (from README)

- Primary path requires being inside a Claude Code session; only `--ollama` is cron-friendly.
- LLM stochasticity → runs are not reproducible.
- WhatsApp-only parsers today; new formats require new parsers in `src/stages/process.ts`.
- Token estimator is tuned for Romanian/English; other languages may need adjustment.
