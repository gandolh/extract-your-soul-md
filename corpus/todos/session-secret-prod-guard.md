# Harden secrets: production startup guard for SESSION_SECRET

**Priority:** P2 · **Goal:** engineering · **Impact:** medium · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
`SESSION_SECRET` defaults to the literal `dev-insecure-session-secret-change-me`
([config.ts:41](../../src/config.ts#L41)), which passes zod's `.min(16)`, so a
misconfigured prod deploy silently signs `sid` cookies with a publicly-known,
forgeable key ([app.ts:48](../../src/server/app.ts#L48)). No startup warning.
CLAUDE.md names this exact risk.

## Decision / approach (audit-refined — keep the guard, drop the CSRF half)
- Export the default as a named constant
  `export const DEV_SESSION_SECRET = '…'` from
  [config.ts](../../src/config.ts) and reference it in `.default(...)`.
- In `buildServer` ([app.ts](../../src/server/app.ts)), before registering the
  cookie plugin: if `isProd && cfg.sessionSecret === DEV_SESSION_SECRET` → throw
  with an actionable message (`openssl rand -hex 32`); else if it equals the
  default → `app.log.warn`. (In `app.ts`, not `serve.ts`, so it covers all
  `buildServer` callers incl. tests/serve:prod.)
- Append a line to `.env.example`: `secure` cookies require TLS (else login
  silently breaks behind plain HTTP).
- **Drop CSRF** — `SameSite=lax` already blocks cross-site mutations; double-submit
  tokens are a new dep + frontend plumbing, a separate task.

## First step
Add `DEV_SESSION_SECRET` constant to [config.ts](../../src/config.ts), then the
guard in `buildServer`.

## Refs
code: [config.ts](../../src/config.ts), [auth.ts](../../src/server/auth.ts), [app.ts](../../src/server/app.ts), [serve.ts](../../src/server/serve.ts)
