import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Config } from '../config.js';
import { processAll, QUESTIONNAIRE_PROCESSED_FILENAME } from './process.js';
import { chunkAll } from './chunk.js';
import { appendConfirmedStatements, CONFIRMED_STATEMENTS_ID } from '../answers-file.js';

// fs-coupled tests for the no-LLM data-prep core: the questionnaire is the only
// input source now (study answers + confirmed swipe statements, both written
// into answers.md upstream). Cover: questionnaire parsing/isolation, the
// confirmed-statements block riding the same file, and chunk-budget honesty.

// A throwaway Config rooted at a temp dir. Only the fields the data-prep stages
// read are meaningful; the rest are filled with harmless defaults.
function testConfig(root: string): Config {
  return {
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
    ollamaHost: 'http://localhost:11434',
    ollamaModel: 'test',
    ollamaApiKey: '',
    ollamaNumCtx: 8192,
    ollamaTemperature: 0,
    ollamaTimeoutMs: 1000,
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

function writeAnswers(cfg: Config, body: string): string {
  mkdirSync(cfg.questionnaireDir, { recursive: true });
  const p = path.join(cfg.questionnaireDir, cfg.questionnaireFile);
  writeFileSync(p, body, 'utf8');
  return p;
}

test('processAll parses answers into the questionnaire file and drops skipped sections', () => {
  withTempDir((root) => {
    const cfg = testConfig(root);
    writeAnswers(
      cfg,
      '## Q1 — Recurring frustration\n\nMy frustration prose answer.\n\n' +
        '## Q2 — Hidden passion\n\n[skipped]\n',
    );

    const stats = processAll(cfg);
    const out = readFileSync(path.join(cfg.inputsProcessedDir, QUESTIONNAIRE_PROCESSED_FILENAME), 'utf8');

    assert.equal(stats.questionnaireAnswers, 1, 'only the answered question counts');
    assert.ok(out.includes('My frustration prose answer.'));
    assert.ok(!out.includes('Hidden passion'), 'skipped section is dropped');
  });
});

test('processAll throws when there is nothing to process', () => {
  withTempDir((root) => {
    const cfg = testConfig(root);
    // No answers.md at all.
    assert.throws(() => processAll(cfg), /No questionnaire answers/);
  });
});

test('confirmed swipe statements ride the questionnaire file into processed output', () => {
  withTempDir((root) => {
    const cfg = testConfig(root);
    const answersPath = writeAnswers(cfg, '## Q1 — Recurring frustration\n\nA real answer.\n');
    appendConfirmedStatements(answersPath, ['I overthink small decisions.', 'I write in short bursts.']);

    processAll(cfg);
    const out = readFileSync(path.join(cfg.inputsProcessedDir, QUESTIONNAIRE_PROCESSED_FILENAME), 'utf8');

    // The reserved Q900 section and both confirmed statements survive parsing.
    assert.ok(out.includes(CONFIRMED_STATEMENTS_ID), 'reserved confirmed-statements section present');
    assert.ok(out.includes('I overthink small decisions.'));
    assert.ok(out.includes('I write in short bursts.'));
  });
});

test('appendConfirmedStatements is a no-op with no confirmed statements', () => {
  withTempDir((root) => {
    const cfg = testConfig(root);
    const answersPath = writeAnswers(cfg, '## Q1 — Recurring frustration\n\nA real answer.\n');
    appendConfirmedStatements(answersPath, []);
    const after = readFileSync(answersPath, 'utf8');
    assert.ok(!after.includes(CONFIRMED_STATEMENTS_ID), 'no section added when nothing confirmed');
  });
});

test('chunkAll produces a single questionnaire-kind chunk for the answers', () => {
  withTempDir((root) => {
    const cfg = testConfig(root);
    writeAnswers(cfg, '## Q1 — Recurring frustration\n\nMy frustration prose answer.\n');

    processAll(cfg);
    const manifest = chunkAll(cfg);

    const qChunks = manifest.chunks.filter((c) => c.kind === 'questionnaire');
    assert.equal(qChunks.length, 1, 'exactly one questionnaire chunk');
    assert.ok(qChunks[0].sourceFiles.every((f) => f.includes(QUESTIONNAIRE_PROCESSED_FILENAME)));
  });
});

test('chunkAll: written chunk byte size stays under the num_ctx-derived budget', () => {
  withTempDir((root) => {
    const cfg = testConfig(root);
    // A large multi-question answers file to force real packing/splitting of the
    // questionnaire bucket against the small (8192) test num_ctx.
    const sections = Array.from(
      { length: 60 },
      (_, i) =>
        `## Q${i + 1} — Section ${i}\n\n` +
        `This is a reasonably long free-text answer number ${i} with enough words to add up across many sections and force the chunker to split the questionnaire into multiple parts.\n`,
    );
    writeAnswers(cfg, sections.join('\n'));

    processAll(cfg);
    const manifest = chunkAll(cfg);

    const budget = manifest.chunkTargetTokens;
    for (const c of manifest.chunks) {
      const bytes = readFileSync(path.join(cfg.chunksDir, c.file), 'utf8');
      const wholeFileTokens = Math.ceil(Buffer.byteLength(bytes, 'utf8') / 4);
      assert.ok(
        wholeFileTokens <= budget,
        `${c.file}: whole-file ${wholeFileTokens} tok exceeds budget ${budget}`,
      );
    }
    const sum = manifest.chunks.reduce((s, c) => s + c.estimatedTokens, 0);
    assert.equal(manifest.totalEstimatedTokens, sum);
    assert.ok(readdirSync(cfg.chunksDir).some((f) => /^chunk-\d+\.txt$/.test(f)));
  });
});
