# Sweep expired sessions on boot + timer (and prune the shared bullet cache)

**Priority:** P2 · **Goal:** engineering · **Impact:** medium · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
`findValidSession` deletes a session row only when that exact expired token is
looked up ([repos.ts:80-83](../../src/db/repos.ts#L80-L83)), so abandoned/expired
sessions (30-day TTL) accumulate in the `sessions` table indefinitely;
[schema.sql](../../src/db/schema.sql) has no TTL/sweep. Separately, `.cache/bullets`
([extract.ts:43](../../src/stages/extract.ts#L43)) is process-CWD-global (shared
across **all** web users) and never pruned.

## Decision / approach (audit-refined — ship the sweep; demote the cache prune)
- **Session sweep (do now):** add `src/db/maintenance.ts` exporting
  `sweepExpiredSessions()` = `DELETE FROM sessions WHERE expires_at <= datetime('now')`
  (works because `expires_at` is stored ISO-8601 via `toISOString()`). Call once
  from `buildServer` after `initDb`, and on `setInterval(…, 3_600_000).unref()`.
- **Bullet-cache prune (demoted):** growth is bounded by distinct chunk *content*
  (content-hashed), and it's a safe-to-wipe cache. If done, an age-based prune
  (delete `.cache/bullets/*` older than N days by mtime) in boot maintenance — skip
  LRU. Note: the **shared-across-users** cache dir is the more interesting issue
  (a minor existence/timing leak); namespacing it per-user under a persistent dir
  is the proper fix if/when multi-user matters.
- **Drop** the per-user byte/row quota from this todo (abuse concern, different PR).
- Orphaned WORK_DIR cleanup is mostly handled (`pipeline.ts` finally); a one-shot
  boot `rmSync` of WORK_DIR contents at most (and the job model handles it too).

## First step
Create `src/db/maintenance.ts` with `sweepExpiredSessions()`; call it after
`initDb` in [app.ts](../../src/server/app.ts) + register the hourly interval.

## Refs
code: [repos.ts](../../src/db/repos.ts), [schema.sql](../../src/db/schema.sql), [auth.ts](../../src/server/auth.ts), [app.ts](../../src/server/app.ts), [extract.ts](../../src/stages/extract.ts)
