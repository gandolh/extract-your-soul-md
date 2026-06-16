# 16 — Harden secrets: production startup guard for SESSION_SECRET

**Priority:** P2 · **Goal:** engineering · **Impact:** medium · **Effort:** S · **Status:** done · **Promoted:** 2026-06-16 (from `todos/session-secret-prod-guard.md`) · **Done:** 2026-06-16

## Problem
`SESSION_SECRET` defaulted to the literal `dev-insecure-session-secret-change-me`,
which passes zod's `.min(16)`, so a misconfigured prod deploy silently signed
`sid` cookies with a publicly-known, forgeable key. No startup warning.

## Outcome (2026-06-16)
- `config.ts` exports `DEV_SESSION_SECRET` and references it in `.default(...)`.
- `buildServer` (app.ts), before anything else: if `sessionSecret === DEV_SESSION_SECRET`
  and `isProd` → **throw** an actionable error (`openssl rand -hex 32`); else (dev)
  → `console.warn` and continue. Placed in `buildServer` (not serve.ts) so it
  covers all callers incl. serve:prod and tests.
- `.env.example`: note that the prod guard refuses the dev default, and that prod
  `secure` cookies require TLS (login silently fails behind plain HTTP).
- **Dropped CSRF** per the audit — `SameSite=lax` already blocks cross-site mutations.

Verified at runtime: prod + dev-default → process exits 1 with the message; prod +
`openssl rand -hex 32` secret → boots; dev + dev-default → boots WITH the warning
(confirmed in the raw boot log). Build + typecheck clean. Nothing committed.

## Refs
code: [config.ts](../../../src/config.ts), [app.ts](../../../src/server/app.ts), [auth.ts](../../../src/server/auth.ts)
