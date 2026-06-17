import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeChoiceBody, decodeChoiceBody, type RecordedAnswer } from './answers-file.js';
import { scoreReport, DEFAULT_INCLUDE } from './scoring.js';

// Pin the choice-body round-trip and the scorer's percentage math, including
// the reverse-keying that the trait direction depends on. These are the
// load-bearing bits — a silent break here corrupts every report.

test('encodeChoiceBody / decodeChoiceBody round-trip value + note', () => {
  const body = encodeChoiceBody(['4'], 'especially sci-fi');
  const back = decodeChoiceBody(body);
  assert.deepEqual(back.values, ['4']);
  assert.equal(back.note, 'especially sci-fi');
});

test('empty selection + empty note encodes to the skipped-equivalent empty body', () => {
  assert.equal(encodeChoiceBody([], ''), '');
  assert.equal(encodeChoiceBody(['  '], '   '), '');
});

test('decode tolerates a note-only body (no choice line)', () => {
  const back = decodeChoiceBody('just some prose, no pick');
  assert.deepEqual(back.values, []);
  assert.equal(back.note, 'just some prose, no pick');
});

function answer(id: string, value: string): RecordedAnswer {
  return { id, title: id, body: encodeChoiceBody([value], '') };
}

test('Big Five: a reverse-keyed item is flipped before averaging', () => {
  // Openness loads on Q21 (direct) + Q22 (reverse). Answer "5" to both: the
  // direct one says max-open, the reverse one ("conventional, uncreative" = 5)
  // says min-open. They should cancel to the midpoint (50%).
  const answers = new Map([answer('Q21', '5'), answer('Q22', '5')].map((a) => [a.id, a]));
  const report = scoreReport('big-five', answers);
  const openness = report.axes.find((a) => a.key === 'O');
  assert.ok(openness, 'openness axis present');
  assert.equal(openness!.percent, 50);
});

test('Big Five: consistent high answers read as High', () => {
  // Q21 direct = 5 (very open), Q22 reverse, answer 1 (not conventional) → 5 after flip.
  const answers = new Map([answer('Q21', '5'), answer('Q22', '1')].map((a) => [a.id, a]));
  const report = scoreReport('big-five', answers);
  const openness = report.axes.find((a) => a.key === 'O')!;
  assert.equal(openness.percent, 100);
  assert.match(openness.readout, /High/);
});

test('MBTI: value 5 across an axis maps to the second letter', () => {
  // EI axis = Q30..Q33; all "5" → fully toward I.
  const answers = new Map(
    ['Q30', 'Q31', 'Q32', 'Q33'].map((id) => answer(id, '5')).map((a) => [a.id, a]),
  );
  const report = scoreReport('mbti', answers);
  const ei = report.axes.find((a) => a.key === 'EI')!;
  assert.equal(ei.percent, 100);
  assert.match(ei.readout, /^I /);
  assert.ok(report.summary.startsWith('I'), `type ${report.summary} starts with I`);
});

test('PCM single-select surfaces the chosen frame', () => {
  const answers = new Map([
    ['Q29', { id: 'Q29', title: 'Q29', body: encodeChoiceBody(['actions'], '') }],
  ]);
  const report = scoreReport('pcm', answers);
  assert.equal(report.hasData, true);
  assert.match(report.summary, /Actions/);
});

test('a report with no answers has no data', () => {
  const report = scoreReport('big-five', new Map());
  assert.equal(report.hasData, false);
  assert.equal(report.axes.length, 0);
});

test('MBTI defaults to NOT included in soul.md; others default included', () => {
  assert.equal(DEFAULT_INCLUDE.mbti, false);
  assert.equal(DEFAULT_INCLUDE['big-five'], true);
  assert.equal(DEFAULT_INCLUDE['honesty-tone'], true);
  assert.equal(DEFAULT_INCLUDE.pcm, true);
});
