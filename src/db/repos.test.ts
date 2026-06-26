import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { initDb } from './db.js';
import {
  countSavedStats,
  createJob,
  createUser,
  deleteSavedStat,
  finishJob,
  getActiveJob,
  getConfirmedStatements,
  getRejectedStatements,
  getLatestResult,
  getReports,
  getSavedStat,
  insertSavedStat,
  insertSwipeCards,
  listSavedStats,
  listSwipeCards,
  reclaimStaleJobs,
  saveResult,
  setReportInclude,
  setSwipeVerdict,
  upsertReport,
} from './repos.js';

// The DB layer is the load-bearing single-flight + dedup substrate (the job
// lock, UNIQUE-conflict handling, no-clobber upserts) that nothing else covered.
// These run against a throwaway SQLite file with the real schema.sql applied.

let dir: string;

before(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'soul-db-'));
  initDb(path.join(dir, 'test.sqlite'));
});

after(() => {
  rmSync(dir, { recursive: true, force: true });
});

test('saved_stats: insert, count, UNIQUE(name) conflict, scoped read + delete', () => {
  const u = createUser('saver', 'scrypt$x$y').id;
  const other = createUser('other-saver', 'scrypt$x$y').id;

  const id = insertSavedStat(u, '1-2026-06-26', '{"totalMessages":4}');
  assert.ok(id !== null);
  assert.equal(countSavedStats(u), 1);

  // Same name for the same user is rejected (returns null, not a throw).
  assert.equal(insertSavedStat(u, '1-2026-06-26', '{}'), null);
  // Same name for a DIFFERENT user is fine.
  assert.ok(insertSavedStat(other, '1-2026-06-26', '{}') !== null);

  assert.equal(listSavedStats(u).length, 1);
  // Reads are user-scoped: user `other` cannot fetch u's row by id (no IDOR).
  assert.ok(getSavedStat(u, id!));
  assert.equal(getSavedStat(other, id!), undefined);

  assert.equal(deleteSavedStat(other, id!), false); // can't delete someone else's
  assert.equal(deleteSavedStat(u, id!), true);
  assert.equal(deleteSavedStat(u, id!), false); // already gone
});

test('jobs: at most one live job per user (the DB-level lock), then reusable', () => {
  const u = createUser('jobber', 'scrypt$x$y').id;

  const job = createJob(u);
  assert.ok(getActiveJob(u));
  // The partial unique index forbids a second live job for the same user.
  assert.throws(() => createJob(u), /UNIQUE|constraint/i);

  finishJob(job.id, 'done');
  assert.equal(getActiveJob(u), undefined);
  // Once the first finished, a new run is allowed.
  assert.ok(createJob(u));
});

test('reclaimStaleJobs flips live jobs to failed and returns them', () => {
  const u = createUser('crashed', 'scrypt$x$y').id;
  createJob(u);
  const reclaimed = reclaimStaleJobs();
  assert.ok(reclaimed.some((j) => j.user_id === u));
  // No live job remains for that user afterwards.
  assert.equal(getActiveJob(u), undefined);
});

test('swipe cards: batch dedup, inserted count, verdict partition', () => {
  const u = createUser('swiper', 'scrypt$x$y').id;

  // 'a' appears twice in the batch → inserted once (UNIQUE(user_id, statement)).
  assert.equal(insertSwipeCards(u, ['a statement', 'b statement', 'a statement']), 2);
  // Re-inserting an existing statement is a no-op; only the new one counts.
  assert.equal(insertSwipeCards(u, ['a statement', 'c statement']), 1);
  assert.equal(listSwipeCards(u).length, 3);

  const cards = listSwipeCards(u);
  setSwipeVerdict(u, cards[0].id, 'yes');
  setSwipeVerdict(u, cards[1].id, 'no');
  assert.deepEqual(getConfirmedStatements(u), ['a statement']);
  assert.deepEqual(getRejectedStatements(u), ['b statement']);

  // Verdicts are user-scoped: a wrong-user update changes nothing.
  assert.equal(setSwipeVerdict(u + 999, cards[2].id, 'yes'), false);
});

test('results round-trip the regurgitation summary (and default to null)', () => {
  const u = createUser('extracted', 'scrypt$x$y').id;

  saveResult(u, '# soul one', null, 'ollama'); // no regurgitation arg → null
  assert.equal(getLatestResult(u)!.regurgitation, null);

  const summary = JSON.stringify({ ngram: 7, count: 2, samples: ['a b c', 'd e f'] });
  saveResult(u, '# soul two', '# soul one', 'ollama', summary);
  const latest = getLatestResult(u)!;
  assert.equal(latest.soul_md, '# soul two');
  assert.equal(latest.prev_md, '# soul one');
  assert.equal(latest.regurgitation, summary);
});

test('upsertReport preserves the user include toggle on rescore (no clobber)', () => {
  const u = createUser('reporter', 'scrypt$x$y').id;

  upsertReport(u, 'mbti', '{"v":1}', false); // first insert: include defaults off
  setReportInclude(u, 'mbti', true); // user opts in
  upsertReport(u, 'mbti', '{"v":2}', false); // rescore: must NOT reset include to off

  const mbti = getReports(u).find((r) => r.report_key === 'mbti');
  assert.ok(mbti);
  assert.equal(mbti!.include_in_soul, 1); // toggle preserved
  assert.equal(JSON.parse(mbti!.payload).v, 2); // payload refreshed
});
