# Brief 08 — Switch extraction backend to Ollama Cloud (API-key auth)

**New brief** (not from a todo — user request, 2026-06-16).
**Priority:** P1 · **Goal:** engineering · **Impact:** medium · **Effort:** S · **Captured:** 2026-06-16 · **Promoted:** 2026-06-16 · **Done:** 2026-06-16

## Why
User wants extraction to run against **Ollama Cloud** (https://ollama.com) for
now, providing the API key via env. Ollama Cloud exposes the same `/api/generate`
endpoint as a local server but requires a `Bearer` token and uses `-cloud`-tagged
models. The change is additive — local mode stays fully supported (blank key →
no auth header).

## Decisions (user, 2026-06-16)
- **Flip the defaults to cloud**: `OLLAMA_HOST=https://ollama.com`,
  `OLLAMA_MODEL=gpt-oss:120b-cloud`. Local users override host+model and leave the
  key blank.
- Default model **`gpt-oss:120b-cloud`** (strongest general reasoning for the
  analytical map/reduce; corpus is RO/EN, but gpt-oss handles both well). Gemma 3
  was considered for multilingual fidelity; gpt-oss chosen for raw strength.

## Outcome (2026-06-16)
- [ollama.ts](../../../src/ollama.ts): `OllamaOptions.apiKey?` added; when set,
  request sends `Authorization: Bearer <key>` (ignored by local servers).
- [config.ts](../../../src/config.ts): `OLLAMA_HOST` default →
  `https://ollama.com`, `OLLAMA_MODEL` default → `gpt-oss:120b-cloud`, new
  `OLLAMA_API_KEY` (default `''`), plus the `ollamaApiKey` Config field + mapping.
- Threaded `apiKey: cfg.ollamaApiKey` into all three `generate()` call sites
  (2 in [extract.ts](../../../src/stages/extract.ts), 1 in
  [eval-run.ts](../../../src/server/eval-run.ts)).
- [.env.example](../../../.env.example): Ollama block rewritten with cloud-default
  + local-override instructions; dropped the stale "fallback path / --ollama" note.

Verified: `npm run build` + server build clean. Mock-fetch check confirmed the
Bearer header is sent **only** when `apiKey` is present (cloud) and omitted
otherwise (local) — local mode unbroken. End-to-end cloud generation needs the
user's real key, to be tested by the user.

## Notes / caveats
- Cloud generation is a paid/remote call — the existing `.cache/bullets` +
  `.cache/eval` content-hash caches (keyed incl. model) mean re-runs at the same
  config don't re-bill. Switching model invalidates those keys (correct).
- `OLLAMA_NUM_CTX` still governs the chunk budget; cloud models support larger
  contexts, so it can be raised for fewer/larger chunks.
- Determinism caveat unchanged — temp 0 + fixed seed; cloud-side nondeterminism
  may still leak (same as GPU nondeterminism locally).

## Refs
code: [ollama.ts](../../../src/ollama.ts), [config.ts](../../../src/config.ts), [stages/extract.ts](../../../src/stages/extract.ts), [server/eval-run.ts](../../../src/server/eval-run.ts) · docs: [.env.example](../../../.env.example), [wiki/decisions.md](../../wiki/decisions.md)
