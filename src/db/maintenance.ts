// Periodic DB housekeeping. findValidSession only deletes an expired row when
// that exact token is looked up, so abandoned sessions (30-day TTL) would
// otherwise accumulate forever. Sweep them on boot + hourly.

import { getDb } from './db.js';

/** Delete every session whose expiry has passed. Returns the row count removed.
 *  `expires_at` is stored as a JS ISO-8601 string (toISOString(), e.g.
 *  `2026-06-16T18:46:39.466Z`). That `T`/`Z` form does NOT string-compare
 *  correctly against SQLite's `datetime('now')` (space-separated, no `Z`) — `T`
 *  sorts after a space, so a raw `<=` reads expired rows as still-valid. Wrap
 *  both sides in datetime() so SQLite parses them to the same canonical form. */
export function sweepExpiredSessions(): number {
  const info = getDb()
    .prepare("DELETE FROM sessions WHERE datetime(expires_at) <= datetime('now')")
    .run();
  return Number(info.changes);
}
