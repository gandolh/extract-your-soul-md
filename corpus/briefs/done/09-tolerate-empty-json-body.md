# Brief 09 — Tolerate empty JSON body on bodyless POSTs

**New brief** (not from a todo — found during the brief-08 cloud test, 2026-06-16).
**Priority:** P2 · **Goal:** engineering · **Impact:** low · **Effort:** S · **Captured:** 2026-06-16 · **Promoted:** 2026-06-16 · **Done:** 2026-06-16

## Why
While testing Ollama Cloud (brief 08), a `POST /api/extract` with
`Content-Type: application/json` and **no body** returned Fastify's
`FST_ERR_CTP_EMPTY_JSON_BODY` (400) before the route ran. The real frontend
`api.extract()`/`logout()` send no body AND no content-type, so they dodge it
today — but it's a latent trap: any caller or proxy that attaches the json
content-type to a bodyless POST gets a confusing framework 400 instead of the
route's own logic. `/api/extract` and `/api/eval` are legitimately bodyless.

## Scope (the change)
[server/app.ts](../../../src/server/app.ts): register a custom
`application/json` content-type parser (`parseAs: 'string'`) that treats an
empty/whitespace body as `{}`, and still 400s on malformed JSON.

## Outcome (2026-06-16)
Implemented as specced. Verified on a throwaway server:
- bodyless POST + json content-type → reaches handler as `{}` (returns the
  route's own 400 "fill in an answer…", not the framework empty-body 400);
- empty-string body → same;
- malformed JSON → still 400 (validation not weakened);
- valid JSON body → unchanged (204 on logout).
`npm run build:server` clean. No frontend change needed — the client only sends a
json content-type when a body is present (verified in
[frontend/src/api/client.ts](../../../frontend/src/api/client.ts) `request`).

## Refs
code: [server/app.ts](../../../src/server/app.ts), [frontend/src/api/client.ts](../../../frontend/src/api/client.ts) · context: [briefs/done/08](08-ollama-cloud-backend.md)
