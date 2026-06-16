# 19 — Stop register user-enumeration (generic conflict message)

**Priority:** P3 · **Goal:** engineering · **Impact:** low · **Effort:** S · **Status:** done · **Promoted:** 2026-06-16 (from `todos/register-enumeration-rate-limit.md`) · **Done:** 2026-06-16

## Problem
Register leaked account existence by returning 409 "That username is taken." even
though login uses a generic message.

## Outcome (2026-06-16)
- `auth.ts` register conflict body → generic "Could not create account." (409 kept).
  Matches login's existing generic "Wrong username or password."
- **Deferred (gate on a real public deploy):** `@fastify/rate-limit` on
  `/api/auth/*` + `/api/extract`, a failed-login counter. The server binds to
  `localhost` by default and auth is deliberately pragmatic, so there's no live
  attack surface today. **Dropped** invite/email-verify (no mailer; contradicts
  local-first posture).

Verified at runtime: registering a duplicate username returns
`{"error":"Could not create account."}` with 409. Build + typecheck clean.
Nothing committed.

## Refs
code: [auth.ts (route)](../../../src/server/routes/auth.ts) · corpus: [decisions.md](../../wiki/decisions.md)
