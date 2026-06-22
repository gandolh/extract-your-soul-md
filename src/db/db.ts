// SQLite access via Node's built-in node:sqlite (Node 24+, experimental — the
// server is launched with --no-warnings=ExperimentalWarning). Synchronous,
// on-disk, zero native build. The API mirrors better-sqlite3, so migrating
// later (should node:sqlite churn) is mechanical.

import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let db: DatabaseSync | null = null;

// schema.sql sits next to this module in src/, but `tsc` does not copy it into
// dist/. Resolve it relative to the module first, then fall back to the src
// tree (covers the compiled-prod case where only the .js landed in dist/db/).
function readSchema(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(here, 'schema.sql'),
    path.resolve(here, '..', '..', 'src', 'db', 'schema.sql'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return readFileSync(c, 'utf8');
  }
  throw new Error(`schema.sql not found (looked in: ${candidates.join(', ')})`);
}

// `CREATE TABLE IF NOT EXISTS` never adds columns to a pre-existing table, so a
// column added after a DB already exists needs a guarded ALTER (SQLite has no
// `ADD COLUMN IF NOT EXISTS` — read PRAGMA table_info first, add what's missing,
// keep it idempotent; new columns must be nullable or carry a DEFAULT). There
// are no such migrations right now — every live table is created by schema.sql.
function migrate(_conn: DatabaseSync): void {
  // intentionally empty — see note above
}

export function openDb(dbPath: string): DatabaseSync {
  const abs = path.resolve(dbPath);
  mkdirSync(path.dirname(abs), { recursive: true });
  const conn = new DatabaseSync(abs);
  conn.exec(readSchema());
  migrate(conn);
  return conn;
}

/** Process-wide singleton, opened on first use. */
export function initDb(dbPath: string): DatabaseSync {
  if (!db) db = openDb(dbPath);
  return db;
}

export function getDb(): DatabaseSync {
  if (!db) throw new Error('Database not initialized — call initDb(dbPath) first.');
  return db;
}
