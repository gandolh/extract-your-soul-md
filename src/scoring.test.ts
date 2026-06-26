import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeChoiceBody, decodeChoiceBody, type RecordedAnswer } from './answers-file.js';
import { scoreReport, DEFAULT_INCLUDE } from './scoring.js';
import { QUESTIONS } from './questions.js';

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

test('every scored report defaults included under the co-equal premise (incl. MBTI)', () => {
  // Co-equal premise (src/scoring.ts): self-report collaborates with observed
  // voice rather than being subordinate, so every report is on by default —
  // MBTI included, but it carries the strongest self-report caveat into the UI
  // + prompt. (Flipped from the earlier MBTI-off default in commit 130f305.)
  assert.equal(DEFAULT_INCLUDE.mbti, true);
  assert.equal(DEFAULT_INCLUDE['big-five'], true);
  assert.equal(DEFAULT_INCLUDE['honesty-tone'], true);
  assert.equal(DEFAULT_INCLUDE.pcm, true);
});

// --- Cognitive functions (home-grown IPIP→Jung mapping, EXPLORATORY) -------
// Brief 38: 8 function axes (0..100) + a derived top-2 "stack" summary; OFF by
// default (deliberate exception to the "all reports on" premise).

test('Cognitive functions: all-high-Ne answers put Ne at the top of the stack', () => {
  // Answer "5" to both Ne items (Q90, Q91) and "1" to every other function's
  // items → Ne is the strongest, so it must lead the stack summary.
  const all = QUESTIONS.filter((q) => q.reportKey === 'cognitive-functions');
  const answers = new Map(
    all.map((q) => {
      const v = q.functionKey === 'Ne' ? '5' : '1';
      return answer(q.id, v);
    }).map((a) => [a.id, a]),
  );
  const report = scoreReport('cognitive-functions', answers);
  assert.equal(report.hasData, true);
  // 8 function axes present.
  assert.equal(report.axes.length, 8);
  const ne = report.axes.find((a) => a.key === 'Ne')!;
  assert.equal(ne.percent, 100);
  // Stack headline leads with Ne.
  assert.match(report.summary, /^Lead: Ne /);
  assert.match(report.summary, /exploratory/);
});

test('Cognitive functions: no answers → no data, empty axes', () => {
  const report = scoreReport('cognitive-functions', new Map());
  assert.equal(report.hasData, false);
  assert.equal(report.axes.length, 0);
  assert.equal(report.summary, '');
});

test('Cognitive functions: off by default (opt-in exception to all-reports-on)', () => {
  assert.equal(DEFAULT_INCLUDE['cognitive-functions'], false);
});
