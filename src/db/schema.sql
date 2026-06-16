-- Applied (idempotently) on every server boot. SQLite is the source of truth
-- for the web platform; the file-based pipeline is generated on demand from
-- these rows at extraction time.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,                       -- scrypt$<saltHex>$<hashHex>
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,                        -- randomBytes(32).hex
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- One row per (user, question). study_id is denormalized for fast per-study
-- reads; question_id ('Q1'..) is the key that survives into answers.md.
CREATE TABLE IF NOT EXISTS study_answers (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  study_id    TEXT NOT NULL,
  question_id TEXT NOT NULL,
  title       TEXT NOT NULL,                          -- snapshot at save time
  body        TEXT NOT NULL,                          -- '' means skipped
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_answers_study ON study_answers(user_id, study_id);

CREATE TABLE IF NOT EXISTS conversations (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename   TEXT NOT NULL,
  content    TEXT NOT NULL,                           -- raw WhatsApp export
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id);

-- Replaces inputs/my-names.txt: the display names that mark "you" in exports.
CREATE TABLE IF NOT EXISTS user_names (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  PRIMARY KEY (user_id, name)
);

CREATE TABLE IF NOT EXISTS results (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  soul_md    TEXT NOT NULL,
  prev_md    TEXT,                                    -- backup-on-overwrite
  extractor  TEXT NOT NULL,                           -- 'ollama'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_results_user ON results(user_id, created_at);

-- One extraction run. Replaces the old in-memory lock: the "is this user
-- extracting?" check is now a query for a row in status enqueued|running, so the
-- lock survives a server restart. On boot, jobs left enqueued/running (the
-- process died mid-run) are reclaimed: marked failed + their work_dir removed.
CREATE TABLE IF NOT EXISTS jobs (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL,                          -- enqueued|running|done|failed
  stage       TEXT,                                   -- map|reduce|null
  chunk_done  INTEGER NOT NULL DEFAULT 0,
  chunk_total INTEGER NOT NULL DEFAULT 0,
  work_dir    TEXT,                                   -- throwaway dir to reclaim on stale
  error       TEXT,
  started_at  TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id, started_at);
-- At most one live (enqueued|running) job per user — the DB-level lock.
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_active
  ON jobs(user_id) WHERE status IN ('enqueued', 'running');
