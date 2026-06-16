# 17 — Sweep expired sessions on boot + hourly timer

**Priority:** P2 · **Goal:** engineering · **Impact:** medium · **Effort:** S · **Status:** done · **Promoted:** 2026-06-16 (from `todos/expired-session-sweep.md`) · **Done:** 2026-06-16

## Problem
`findValidSession` deletes an expired row only when that exact token is looked up,
so abandoned sessions (30-day TTL) accumulate in `sessions` indefinitely; no
TTL/sweep anywhere.

## Outcome (2026-06-16)
- New `src/db/maintenance.ts` exporting `sweepExpiredSessions()`.
- `buildServer` calls it once after `initDb`, then on
  `setInterval(…, 3_600_000).unref()` (timer never keeps the process alive).
- **Bullet-cache prune demoted / WORK_DIR cleanup already handled** by brief 14
  (job reclamation) — kept out of scope per the audit.

**Bug caught by verification (the todo's stated assumption was wrong):** the todo
claimed `expires_at <= datetime('now')` "works because expires_at is ISO-8601".
It does NOT — `toISOString()` yields `2026-06-16T18:46:39.466Z` (with `T`/`Z`),
which string-compares as GREATER than SQLite's space-separated `datetime('now')`
(`T` 0x54 > space 0x20), so expired rows read as still-valid (raw compare returned
0). Fixed to `datetime(expires_at) <= datetime('now')` so SQLite parses both to a
canonical form (verified: deletes exactly the expired row, keeps valid ones).

Verified: direct-query test (1 expired deleted, 2 valid kept) + full boot test
(seeded expired session gone after restart). Build + typecheck clean. Test
sessions cleaned. Nothing committed.

## Refs
code: [maintenance.ts](../../../src/db/maintenance.ts), [repos.ts](../../../src/db/repos.ts), [app.ts](../../../src/server/app.ts)
