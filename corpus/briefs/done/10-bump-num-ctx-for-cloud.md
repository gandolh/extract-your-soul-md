# Brief 10 — Bump OLLAMA_NUM_CTX to 32768 for the cloud model

**New brief** (not from a todo — follow-on from brief 08, user request 2026-06-16).
**Priority:** P2 · **Goal:** accuracy · **Impact:** medium · **Effort:** S · **Captured:** 2026-06-16 · **Promoted:** 2026-06-16 · **Done:** 2026-06-16

## Why
After switching to Ollama Cloud (brief 08), the brief-08 test log showed the
chunk budget clamping `30000 → 6912` because `OLLAMA_NUM_CTX=8192` — a local-WSL2
floor that's pointless on `gpt-oss:120b-cloud` (128k context). Small `num_ctx` →
many tiny chunks → a thin per-chunk view and more map calls.

## Decision
Set `OLLAMA_NUM_CTX=32768`. The chunk budget is
`min(CHUNK_TARGET_TOKENS, num_ctx − HEADER_RESERVE − OUTPUT_RESERVE)` =
`min(30000, 32768 − 768 − 512)` = **30000** — chunks reach the full target and
`num_ctx` stops being the bottleneck. Going higher (64k+) gives nothing more
unless `CHUNK_TARGET_TOKENS` is also raised, so 32768 is the right stopping point.

## Outcome (2026-06-16)
Changed the default in [config.ts](../../../src/config.ts) (8192 → 32768), the
live `.env`, and `.env.example` (value + refreshed the stale chunking comment,
which still said reserves ~600 / clamp ~7080 from before brief 06 bumped
HEADER_RESERVE to 768). Verified by running `chunkAll` in-process: manifest
`chunkTargetTokens` = **30000** (was 6912), `clamped? NO`. `npm run build:server`
clean. Cloud extraction still succeeds end-to-end (~23s).

## Notes
- Larger chunks = fewer map calls = fewer cloud round-trips per extraction (also
  slightly cheaper given per-request overhead).
- Lowering `num_ctx` again (small local model) still works — the budget shrinks
  proportionally and the stage logs the clamp.

## Refs
code: [config.ts](../../../src/config.ts), [stages/chunk.ts](../../../src/stages/chunk.ts) · docs: [.env.example](../../../.env.example) · context: [briefs/done/08](08-ollama-cloud-backend.md)
