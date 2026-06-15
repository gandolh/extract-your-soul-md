# Stop register user-enumeration now; rate-limit when deploying

**Priority:** P3 · **Goal:** engineering · **Impact:** low · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
Register leaks account existence by returning 409 "That username is taken."
([auth.ts route:36](../../src/server/routes/auth.ts#L36)) even though login uses a
generic message. No throttling anywhere; `/api/auth/*` and `/api/extract` are
unthrottled. But the server binds to `localhost` by default
([index.ts:53](../../src/index.ts#L53)) and auth is deliberately "pragmatic"
([decisions.md](../wiki/decisions.md)) — so there's no live attack surface today.

## Decision / approach (audit-refined — ship the free fix, defer the rest)
- **Now (correct regardless of deploy):** change the register conflict body to a
  generic "Could not create account." (keep the 409 status). Stops enumeration;
  matches login's existing generic message.
- **Defer (gate on a real public deploy):** add `@fastify/rate-limit` with a lax
  global default + tighter limits on `/api/auth/login`, `/register`, `/extract`
  (the extract IP cap is mostly redundant with the in-memory per-user lock); a
  small failed-login counter. Log this decision in
  [open-questions.md](../wiki/open-questions.md).
- **Dropped:** invite/email-verify (no mailer; contradicts local-first posture).

## First step
Replace the [auth.ts:36](../../src/server/routes/auth.ts#L36) 409 body with a
generic message.

## Refs
code: [auth.ts (route)](../../src/server/routes/auth.ts), [auth.ts](../../src/server/auth.ts), [app.ts](../../src/server/app.ts), [index.ts](../../src/index.ts) · corpus: [decisions.md](../wiki/decisions.md)
