// Typed data-access layer over the SQLite tables. All synchronous (node:sqlite).
// RecordedAnswer is reused from answers-file.ts so the DB layer and the
// answers.md writer share one shape — answers round-trip with no translation.

import { randomBytes } from 'node:crypto';
import { getDb } from './db.js';
import type { RecordedAnswer } from '../answers-file.js';

// node:sqlite returns rows as Record<string, SQLOutputValue>; we know the
// shapes from the schema, so cast through unknown at each call site.
type Row = Record<string, unknown>;
function rows<T>(r: Row[]): T[] {
  return r as unknown as T[];
}
function row<T>(r: Row | undefined): T | undefined {
  return r as unknown as T | undefined;
}

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface ConversationRow {
  id: number;
  filename: string;
  created_at: string;
}

export interface ResultRow {
  id: number;
  soul_md: string;
  prev_md: string | null;
  extractor: string;
  created_at: string;
}

// ---- users ---------------------------------------------------------------

export function createUser(username: string, passwordHash: string): { id: number } {
  const stmt = getDb().prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)',
  );
  const info = stmt.run(username, passwordHash);
  return { id: Number(info.lastInsertRowid) };
}

export function findUserByUsername(username: string): UserRow | undefined {
  return row<UserRow>(
    getDb().prepare('SELECT * FROM users WHERE username = ?').get(username) as Row | undefined,
  );
}

export function findUserById(id: number): UserRow | undefined {
  return row<UserRow>(
    getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as Row | undefined,
  );
}

// ---- sessions ------------------------------------------------------------

export function createSession(userId: number, ttlMs: number): { id: string; expiresAt: string } {
  const id = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  getDb()
    .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .run(id, userId, expiresAt);
  return { id, expiresAt };
}

export function findValidSession(sessionId: string): { userId: number } | undefined {
  const found = row<{ user_id: number; expires_at: string }>(
    getDb()
      .prepare('SELECT user_id, expires_at FROM sessions WHERE id = ?')
      .get(sessionId) as Row | undefined,
  );
  if (!found) return undefined;
  if (new Date(found.expires_at).getTime() <= Date.now()) {
    deleteSession(sessionId);
    return undefined;
  }
  return { userId: found.user_id };
}

export function deleteSession(sessionId: string): void {
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

// ---- study answers -------------------------------------------------------

/** All answers for a user, in {id, title, body} shape for the answers.md writer. */
export function getAnswersForUser(userId: number): RecordedAnswer[] {
  return rows<RecordedAnswer>(
    getDb()
      .prepare('SELECT question_id AS id, title, body FROM study_answers WHERE user_id = ?')
      .all(userId) as Row[],
  );
}

/** Answers for a single study (used to pre-fill a form). */
export function getStudyAnswers(userId: number, studyId: string): Map<string, RecordedAnswer> {
  const list = rows<RecordedAnswer>(
    getDb()
      .prepare('SELECT question_id AS id, title, body FROM study_answers WHERE user_id = ? AND study_id = ?')
      .all(userId, studyId) as Row[],
  );
  return new Map(list.map((r) => [r.id, r]));
}

/** Replace this study's answers in one transaction (upsert each question). */
export function upsertStudyAnswers(
  userId: number,
  studyId: string,
  answers: ReadonlyArray<RecordedAnswer>,
): void {
  const conn = getDb();
  const stmt = conn.prepare(
    `INSERT INTO study_answers (user_id, study_id, question_id, title, body, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, question_id) DO UPDATE SET
       study_id = excluded.study_id,
       title = excluded.title,
       body = excluded.body,
       updated_at = datetime('now')`,
  );
  conn.exec('BEGIN');
  try {
    for (const a of answers) {
      stmt.run(userId, studyId, a.id, a.title, a.body);
    }
    conn.exec('COMMIT');
  } catch (err) {
    conn.exec('ROLLBACK');
    throw err;
  }
}

/** Count of answered (non-empty) questions for a user, by question id. */
export function answeredQuestionIds(userId: number): Set<string> {
  const list = rows<{ question_id: string }>(
    getDb()
      .prepare("SELECT question_id FROM study_answers WHERE user_id = ? AND body <> ''")
      .all(userId) as Row[],
  );
  return new Set(list.map((r) => r.question_id));
}

// ---- reports -------------------------------------------------------------

export interface ReportRow {
  report_key: string;
  payload: string; // JSON
  include_in_soul: number; // 0 | 1
  updated_at: string;
}

export function getReports(userId: number): ReportRow[] {
  return rows<ReportRow>(
    getDb()
      .prepare(
        'SELECT report_key, payload, include_in_soul, updated_at FROM reports WHERE user_id = ?',
      )
      .all(userId) as Row[],
  );
}

/**
 * Upsert a scored report. `defaultInclude` is applied only on first insert;
 * a later rescore preserves the user's toggle choice (we don't clobber
 * include_in_soul on conflict).
 */
export function upsertReport(
  userId: number,
  reportKey: string,
  payloadJson: string,
  defaultInclude: boolean,
): void {
  getDb()
    .prepare(
      `INSERT INTO reports (user_id, report_key, payload, include_in_soul, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, report_key) DO UPDATE SET
         payload = excluded.payload,
         updated_at = datetime('now')`,
    )
    .run(userId, reportKey, payloadJson, defaultInclude ? 1 : 0);
}

/** Flip a report's include-in-soul toggle. */
export function setReportInclude(userId: number, reportKey: string, include: boolean): void {
  getDb()
    .prepare(
      "UPDATE reports SET include_in_soul = ?, updated_at = datetime('now') WHERE user_id = ? AND report_key = ?",
    )
    .run(include ? 1 : 0, userId, reportKey);
}

// ---- conversations -------------------------------------------------------

export function addConversation(
  userId: number,
  filename: string,
  content: string,
): { id: number } {
  const info = getDb()
    .prepare('INSERT INTO conversations (user_id, filename, content) VALUES (?, ?, ?)')
    .run(userId, filename, content);
  return { id: Number(info.lastInsertRowid) };
}

export function listConversations(userId: number): ConversationRow[] {
  return rows<ConversationRow>(
    getDb()
      .prepare('SELECT id, filename, created_at FROM conversations WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Row[],
  );
}

export function getConversationContents(
  userId: number,
): Array<{ filename: string; content: string }> {
  return rows<{ filename: string; content: string }>(
    getDb()
      .prepare('SELECT filename, content FROM conversations WHERE user_id = ?')
      .all(userId) as Row[],
  );
}

export function deleteConversation(userId: number, id: number): void {
  getDb()
    .prepare('DELETE FROM conversations WHERE user_id = ? AND id = ?')
    .run(userId, id);
}

export function hasConversations(userId: number): boolean {
  const row = getDb()
    .prepare('SELECT 1 FROM conversations WHERE user_id = ? LIMIT 1')
    .get(userId);
  return row !== undefined;
}

// ---- names ---------------------------------------------------------------

export function getNames(userId: number): string[] {
  const list = rows<{ name: string }>(
    getDb()
      .prepare('SELECT name FROM user_names WHERE user_id = ? ORDER BY name')
      .all(userId) as Row[],
  );
  return list.map((r) => r.name);
}

export function setNames(userId: number, names: string[]): void {
  const conn = getDb();
  const clean = [...new Set(names.map((n) => n.trim()).filter((n) => n.length > 0))];
  conn.exec('BEGIN');
  try {
    conn.prepare('DELETE FROM user_names WHERE user_id = ?').run(userId);
    const stmt = conn.prepare('INSERT INTO user_names (user_id, name) VALUES (?, ?)');
    for (const name of clean) stmt.run(userId, name);
    conn.exec('COMMIT');
  } catch (err) {
    conn.exec('ROLLBACK');
    throw err;
  }
}

// ---- results -------------------------------------------------------------

export function getLatestResult(userId: number): ResultRow | undefined {
  return row<ResultRow>(
    getDb()
      .prepare('SELECT id, soul_md, prev_md, extractor, created_at FROM results WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 1')
      .get(userId) as Row | undefined,
  );
}

export function saveResult(
  userId: number,
  soulMd: string,
  prevMd: string | null,
  extractor: string,
): void {
  getDb()
    .prepare(
      'INSERT INTO results (user_id, soul_md, prev_md, extractor) VALUES (?, ?, ?, ?)',
    )
    .run(userId, soulMd, prevMd, extractor);
}

// ---- jobs ----------------------------------------------------------------

export type JobStatus = 'enqueued' | 'running' | 'done' | 'failed';

export interface JobRow {
  id: number;
  user_id: number;
  status: JobStatus;
  stage: string | null;
  chunk_done: number;
  chunk_total: number;
  work_dir: string | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

/** The live (enqueued|running) job for a user, if any. The DB-level lock. */
export function getActiveJob(userId: number): JobRow | undefined {
  return row<JobRow>(
    getDb()
      .prepare(
        "SELECT * FROM jobs WHERE user_id = ? AND status IN ('enqueued', 'running') LIMIT 1",
      )
      .get(userId) as Row | undefined,
  );
}

export function getJob(jobId: number): JobRow | undefined {
  return row<JobRow>(
    getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as Row | undefined,
  );
}

/**
 * Insert an enqueued job. The partial unique index (one live job per user)
 * makes this throw if one is already live — the race-free lock acquisition.
 */
export function createJob(userId: number): { id: number } {
  const info = getDb()
    .prepare("INSERT INTO jobs (user_id, status) VALUES (?, 'enqueued')")
    .run(userId);
  return { id: Number(info.lastInsertRowid) };
}

/** Record the work dir + flip enqueued → running once the run actually starts. */
export function startJob(jobId: number, workDir: string): void {
  getDb()
    .prepare("UPDATE jobs SET status = 'running', work_dir = ? WHERE id = ?")
    .run(workDir, jobId);
}

export function updateJobProgress(
  jobId: number,
  stage: string,
  chunkDone: number,
  chunkTotal: number,
): void {
  getDb()
    .prepare('UPDATE jobs SET stage = ?, chunk_done = ?, chunk_total = ? WHERE id = ?')
    .run(stage, chunkDone, chunkTotal, jobId);
}

export function finishJob(jobId: number, status: 'done' | 'failed', error?: string): void {
  getDb()
    .prepare(
      "UPDATE jobs SET status = ?, error = ?, finished_at = datetime('now') WHERE id = ?",
    )
    .run(status, error ?? null, jobId);
}

/**
 * Reclaim jobs left live by a crash/restart: their work dirs are returned so the
 * caller can rmSync them, then the rows are flipped to failed. Run once on boot.
 */
export function reclaimStaleJobs(): JobRow[] {
  const conn = getDb();
  const stale = rows<JobRow>(
    conn
      .prepare("SELECT * FROM jobs WHERE status IN ('enqueued', 'running')")
      .all() as Row[],
  );
  if (stale.length > 0) {
    conn
      .prepare(
        "UPDATE jobs SET status = 'failed', error = 'Interrupted by a server restart.', " +
          "finished_at = datetime('now') WHERE status IN ('enqueued', 'running')",
      )
      .run();
  }
  return stale;
}
