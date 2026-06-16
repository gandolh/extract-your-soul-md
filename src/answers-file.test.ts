import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  writeAnswersFile,
  parseAnswersFile,
  SKIPPED_MARKER,
  type RecordedAnswer,
} from './answers-file.js';

// The answers.md format is a load-bearing contract shared by the web form
// (writeAnswersFile) and the process.ts parser. These tests pin the round-trip
// so an accidental format change is caught here, not silently in extraction.

function withTempDir(fn: (dir: string) => void): void {
  const dir = mkdtempSync(path.join(tmpdir(), 'soul-answers-'));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('writeAnswersFile → parseAnswersFile round-trips id, title, and body', () => {
  withTempDir((dir) => {
    const file = path.join(dir, 'answers.md');
    const answers: RecordedAnswer[] = [
      { id: 'Q1', title: 'Recurring frustration', body: 'Line one.\nLine two.' },
      { id: 'Q2', title: 'Hidden passion', body: 'A single line.' },
    ];
    writeAnswersFile(file, answers, 'test');
    const parsed = parseAnswersFile(file);

    assert.equal(parsed.get('Q1')?.body, 'Line one.\nLine two.');
    assert.equal(parsed.get('Q1')?.title, 'Recurring frustration');
    assert.equal(parsed.get('Q2')?.body, 'A single line.');
  });
});

test('an empty body is written as the [skipped] marker and parses back as it', () => {
  withTempDir((dir) => {
    const file = path.join(dir, 'answers.md');
    writeAnswersFile(
      file,
      [{ id: 'Q1', title: 'Recurring frustration', body: '   ' }],
      'test',
    );
    const parsed = parseAnswersFile(file);
    assert.equal(parsed.get('Q1')?.body, SKIPPED_MARKER);
  });
});

test('parseAnswersFile on a missing file returns an empty map (no throw)', () => {
  withTempDir((dir) => {
    const parsed = parseAnswersFile(path.join(dir, 'nope.md'));
    assert.equal(parsed.size, 0);
  });
});

test('answers are written in QUESTIONS order regardless of input order', () => {
  withTempDir((dir) => {
    const file = path.join(dir, 'answers.md');
    // Supply Q2 before Q1; the file must still list Q1 first.
    writeAnswersFile(
      file,
      [
        { id: 'Q2', title: 'Hidden passion', body: 'second' },
        { id: 'Q1', title: 'Recurring frustration', body: 'first' },
      ],
      'test',
    );
    const parsed = parseAnswersFile(file);
    const ids = [...parsed.keys()];
    assert.ok(ids.indexOf('Q1') < ids.indexOf('Q2'));
  });
});
