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

-- One row per (user, report_key) — a scored trait report derived from the
-- user's choice answers. Recomputed and upserted whenever a profile study is
-- saved. `payload` is JSON (axis percentages + labels) the UI renders directly.
-- `include_in_soul` gates whether the report is folded into soul.md at
-- extraction time (MBTI defaults 0; the other reports default 1 — the default
-- is applied in code at upsert time, not here, since it varies by report_key).
CREATE TABLE IF NOT EXISTS reports (
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_key      TEXT NOT NULL,                        -- big-five|honesty-tone|pcm|mbti
  payload         TEXT NOT NULL,                         -- JSON
  include_in_soul INTEGER NOT NULL DEFAULT 1,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, report_key)
);

CREATE TABLE IF NOT EXISTS conversations (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename   TEXT NOT NULL,
  content    TEXT NOT NULL,                           -- raw WhatsApp export
  -- The source the export came from. Only 'whatsapp' today; column exists so
  -- adding a provider is data-only on the import path.
  provider   TEXT NOT NULL DEFAULT 'whatsapp',
  -- Per-conversation "you" names as a JSON string array. NULL means "fall back
  -- to the user's global user_names". The voice filter matches these per file.
  names      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id);

-- Global fallback for per-conversation names (and the legacy single name list):
-- the display names that mark "you" in exports when a conversation has none set.
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
