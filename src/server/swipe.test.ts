import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStatements } from './swipe.js';

// parseStatements turns a raw LLM response into the deck. It's regex-heavy
// (bullet/number/quote stripping, length filter, case-insensitive dedup, cap),
// exactly the kind of parser that breaks silently — so pin its behavior.

test('strips bullets, numbering, and surrounding quotes', () => {
  const out = parseStatements(
    ['- I love quiet mornings', '2. I overthink decisions', '"I value honesty"'].join('\n'),
  );
  assert.deepEqual(out, ['I love quiet mornings', 'I overthink decisions', 'I value honesty']);
});

test('dedupes case-insensitively', () => {
  const out = parseStatements(['I am calm', 'i am calm', 'I AM CALM'].join('\n'));
  assert.deepEqual(out, ['I am calm']);
});

test('drops too-short, too-long, and letter-less lines', () => {
  const long = 'x'.repeat(250);
  const out = parseStatements(['hi', 'a real statement here', long, '!!! ???'].join('\n'));
  assert.deepEqual(out, ['a real statement here']);
});

test('caps the deck at 30 statements', () => {
  const lines = Array.from({ length: 50 }, (_, i) => `statement number ${i} here`);
  assert.equal(parseStatements(lines.join('\n')).length, 30);
});

test('empty / whitespace input yields no statements', () => {
  assert.deepEqual(parseStatements(''), []);
  assert.deepEqual(parseStatements('\n\n   \n'), []);
});
