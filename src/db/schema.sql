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

-- Tinder-style "does this sound like you?" cards. Each card is a first-person
-- statement an LLM generated from the user's own study answers (+ prior soul.md);
-- the user swipes it yes ("sounds like me") or no. Confirmed ('yes') statements
-- are folded into soul.md at extraction time as endorsed self-descriptions.
-- verdict: NULL = not yet swiped, 'yes' | 'no'. UNIQUE(user_id, statement) so a
-- regeneration that repeats a statement is a no-op rather than a duplicate card.
CREATE TABLE IF NOT EXISTS swipe_cards (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  statement  TEXT NOT NULL,
  verdict    TEXT,                                    -- NULL | 'yes' | 'no'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, statement)
);
CREATE INDEX IF NOT EXISTS idx_swipe_user ON swipe_cards(user_id, id);

-- Saved conversation statistics. The conversation itself is NEVER stored — it
-- is parsed + reduced to aggregate numbers transiently on the server, and only
-- this derived JSON is persisted when the user chooses to keep a result. `name`
-- is user-chosen (default '<index>-<YYYY-MM-DD>'), unique per user.
CREATE TABLE IF NOT EXISTS saved_stats (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  payload    TEXT NOT NULL,                            -- JSON ConversationStats
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, name)
);
CREATE INDEX IF NOT EXISTS idx_saved_stats_user ON saved_stats(user_id, created_at);

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
