import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateTokens } from './tokens.js';

test('estimateTokens: empty string is 0 tokens', () => {
  assert.equal(estimateTokens(''), 0);
});

test('estimateTokens: ~4 bytes per token for ASCII', () => {
  assert.equal(estimateTokens('abcd'), 1); // 4 bytes
  assert.equal(estimateTokens('abcde'), 2); // 5 bytes → ceil(5/4)
  assert.equal(estimateTokens('a'.repeat(40)), 10);
});

test('estimateTokens: counts UTF-8 bytes, so diacritics cost more than chars', () => {
  // Each Romanian diacritic is 2 UTF-8 bytes. 5 chars = 10 bytes → ceil(10/4) = 3,
  // strictly more than the old char/4 = ceil(5/4) = 2. Conservative is the safe
  // direction (guards against silent num_ctx truncation).
  const diacritics = 'ăâîșț';
  assert.equal(diacritics.length, 5);
  assert.equal(estimateTokens(diacritics), 3);
  assert.ok(estimateTokens(diacritics) > Math.ceil(diacritics.length / 4));
});

test('estimateTokens: emoji (4-byte) costs its real budget', () => {
  // A single emoji is 4 UTF-8 bytes → 1 token; its .length is 2 (surrogate pair),
  // so char/4 would have rounded it to 1 too — but a run of them diverges.
  assert.equal(estimateTokens('😀'), 1);
  assert.equal(estimateTokens('😀😀😀😀'), 4); // 16 bytes
});
