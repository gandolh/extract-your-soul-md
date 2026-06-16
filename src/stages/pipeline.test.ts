import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Config } from '../config.js';
import { processAll, QUESTIONNAIRE_PROCESSED_FILENAME } from './process.js';
import { chunkAll } from './chunk.js';

// fs-coupled tests for the no-LLM data-prep core: the voice filter (only the
// user's own messages survive), noise/dedup, questionnaire isolation, and that
// the chunk manifest's token sums match what was written.

// A throwaway Config rooted at a temp dir. Only the fields the data-prep stages
// read are meaningful; the rest are filled with harmless defaults.
function testConfig(root: string): Config {
  return {
    inputsFreeformDir: path.join(root, 'freeform'),
    inputsProcessedDir: path.join(root, 'processed'),
    chunksDir: path.join(root, 'chunks'),
    outDir: path.join(root, 'out'),
    questionnaireDir: path.join(root, 'questionnaire'),
    questionnaireFile: 'answers.md',
    dbPath: path.join(root, 'db.sqlite'),
    workDir: root,
    serverPort: 0,
    sessionSecret: 'x'.repeat(16),
    chunkTargetTokens: 30_000,
    minMessageLength: 3,
    dropUrls: true,
    dropMediaPlaceholders: true,
    ollamaHost: 'http://localhost:11434',
    ollamaModel: 'test',
    ollamaApiKey: '',
    ollamaNumCtx: 8192,
    ollamaTemperature: 0,
    ollamaTimeoutMs: 1000,
    evalHoldoutN: 8,
    evalRawK: 5,
  };
}

function withTempDir(fn: (dir: string) => void): void {
  const dir = mkdtempSync(path.join(tmpdir(), 'soul-pipeline-'));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const WA = (sender: string, body: string) => `[15/03/24, 21:42:11] ${sender}: ${body}`;

test('processAll keeps only the user’s own messages and drops noise/dups', () => {
  withTempDir((root) => {
    const cfg = testConfig(root);
    mkdirSync(cfg.inputsFreeformDir, { recursive: true });
    const chat = [
      WA('Gandolh', 'this is my real message'),
      WA('Alice', 'this is someone else and must be dropped'),
      WA('Gandolh', 'http://example.com'), // URL-only → noise after URL strip
      WA('Gandolh', '<Media omitted>'), // media placeholder → noise
      WA('Gandolh', 'ok'), // below minMessageLength (3) → noise
      WA('Gandolh', 'this is my real message'), // exact dup → dropped
      WA('Gandolh', 'a second distinct message'),
    ].join('\n');
    writeFileSync(path.join(cfg.inputsFreeformDir, 'chat.txt'), chat, 'utf8');

    const stats = processAll(cfg, new Set(['Gandolh']));

    const out = readFileSync(path.join(cfg.inputsProcessedDir, 'chat.txt'), 'utf8');
    const kept = out.trim().split('\n');
    assert.deepEqual(kept, ['this is my real message', 'a second distinct message']);
    assert.equal(stats.linesOut, 2);
    assert.equal(stats.duplicatesDropped, 1);
    assert.ok(!out.includes('someone else'));
  });
});

test('a non-WhatsApp file yields zero parsed senders (the zero-recognized guard signal)', () => {
  // The pipeline-layer NoRecognizedMessagesError guard keys on every source
  // having parsedSenders.length === 0. Pin that ProcessStats contract here so a
  // parser change can't silently defeat the guard.
  withTempDir((root) => {
    const cfg = testConfig(root);
    mkdirSync(cfg.inputsFreeformDir, { recursive: true });
    // Looks nothing like a WhatsApp export (e.g. a Telegram JSON dump or prose).
    writeFileSync(
      path.join(cfg.inputsFreeformDir, 'telegram.json'),
      '{"messages":[{"from":"Gandolh","text":"hi"}]}\njust some prose with no chat format\n',
      'utf8',
    );
    // .json isn't even an accepted extension, so add a .txt with non-chat text too.
    writeFileSync(path.join(cfg.inputsFreeformDir, 'notes.txt'), 'a plain note\nanother line\n', 'utf8');

    const stats = processAll(cfg, new Set(['Gandolh']));
    assert.ok(stats.perSource.length > 0, 'a source was processed');
    assert.ok(
      stats.perSource.every((s) => s.parsedSenders.length === 0),
      'no WhatsApp senders recognized in any source',
    );
    assert.equal(stats.myLinesIn, 0);
    assert.equal(stats.questionnaireAnswers, 0);
  });
});

test('processAll merges continuation lines into the previous own-message', () => {
  withTempDir((root) => {
    const cfg = testConfig(root);
    mkdirSync(cfg.inputsFreeformDir, { recursive: true });
    const chat = [WA('Gandolh', 'first part'), 'continued on next line'].join('\n');
    writeFileSync(path.join(cfg.inputsFreeformDir, 'chat.txt'), chat, 'utf8');

    processAll(cfg, new Set(['Gandolh']));
    const out = readFileSync(path.join(cfg.inputsProcessedDir, 'chat.txt'), 'utf8');
    assert.equal(out.trim(), 'first part continued on next line');
  });
});

test('chunkAll isolates the questionnaire into its own questionnaire-kind chunk', () => {
  withTempDir((root) => {
    const cfg = testConfig(root);
    mkdirSync(cfg.inputsFreeformDir, { recursive: true });
    mkdirSync(cfg.questionnaireDir, { recursive: true });
    writeFileSync(
      path.join(cfg.inputsFreeformDir, 'chat.txt'),
      [WA('Gandolh', 'a chat message that survives the filter')].join('\n'),
      'utf8',
    );
    writeFileSync(
      path.join(cfg.questionnaireDir, 'answers.md'),
      '## Q1 — Recurring frustration\n\nMy frustration prose answer.\n',
      'utf8',
    );

    processAll(cfg, new Set(['Gandolh']));
    const manifest = chunkAll(cfg);

    const qChunks = manifest.chunks.filter((c) => c.kind === 'questionnaire');
    const freeChunks = manifest.chunks.filter((c) => c.kind === 'freeform');
    assert.equal(qChunks.length, 1, 'exactly one questionnaire chunk');
    assert.ok(freeChunks.length >= 1, 'at least one freeform chunk');
    // No questionnaire chunk is mixed with freeform source files.
    assert.ok(qChunks[0].sourceFiles.every((f) => f.includes(QUESTIONNAIRE_PROCESSED_FILENAME)));
  });
});

test('chunkAll: written chunk byte size stays under the num_ctx-derived budget', () => {
  withTempDir((root) => {
    const cfg = testConfig(root);
    mkdirSync(cfg.inputsFreeformDir, { recursive: true });
    // Many distinct messages to force real packing.
    const lines = Array.from({ length: 400 }, (_, i) => WA('Gandolh', `distinct message number ${i} with some body text`));
    writeFileSync(path.join(cfg.inputsFreeformDir, 'big.txt'), lines.join('\n'), 'utf8');

    processAll(cfg, new Set(['Gandolh']));
    const manifest = chunkAll(cfg);

    // The framing-honest budget guarantees the WHOLE written file (header +
    // separators + body), in estimateTokens terms, fits the manifest's budget.
    const budget = manifest.chunkTargetTokens;
    for (const c of manifest.chunks) {
      const bytes = readFileSync(path.join(cfg.chunksDir, c.file), 'utf8');
      const wholeFileTokens = Math.ceil(Buffer.byteLength(bytes, 'utf8') / 4);
      assert.ok(
        wholeFileTokens <= budget,
        `${c.file}: whole-file ${wholeFileTokens} tok exceeds budget ${budget}`,
      );
    }
    // manifest totals match the per-chunk sums.
    const sum = manifest.chunks.reduce((s, c) => s + c.estimatedTokens, 0);
    assert.equal(manifest.totalEstimatedTokens, sum);
    // sanity: we actually produced chunk files
    assert.ok(readdirSync(cfg.chunksDir).some((f) => /^chunk-\d+\.txt$/.test(f)));
  });
});
