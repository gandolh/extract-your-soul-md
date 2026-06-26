import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './auth.js';

// Password hashing is pure (scrypt, no infra) and security-critical, so it's
// worth pinning directly.

test('hashPassword produces the scrypt$salt$hash shape', () => {
  const stored = hashPassword('correct horse');
  const parts = stored.split('$');
  assert.equal(parts.length, 3);
  assert.equal(parts[0], 'scrypt');
  assert.ok(parts[1].length > 0 && parts[2].length > 0);
});

test('verifyPassword accepts the right password, rejects the wrong one', () => {
  const stored = hashPassword('s3cret-pw');
  assert.equal(verifyPassword('s3cret-pw', stored), true);
  assert.equal(verifyPassword('s3cret-pwX', stored), false);
  assert.equal(verifyPassword('', stored), false);
});

test('verifyPassword rejects malformed stored hashes without throwing', () => {
  assert.equal(verifyPassword('x', 'not-a-hash'), false);
  assert.equal(verifyPassword('x', 'bcrypt$salt$hash'), false); // wrong scheme
  assert.equal(verifyPassword('x', 'scrypt$salt$'), false); // empty hex (no 500)
  assert.equal(verifyPassword('x', 'scrypt$$'), false);
});

test('two hashes of the same password differ (random salt)', () => {
  assert.notEqual(hashPassword('same'), hashPassword('same'));
});
