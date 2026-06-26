import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import type { Config } from '../config.js';
import type { OllamaOptions } from '../ollama.js';
import type { Manifest } from './chunk.js';
import { type GenerateFn, runOllamaPipeline, treeReduceBullets } from './extract.js';

// Unit tests for the hierarchical tree-reduce (brief 39). They inject a stub
// `generate` so the map / merge / final-reduce flow runs with no live Ollama.
// Each captured prompt is tagged by its header so we can assert WHICH prompt
// (map / merge / final-reduce) saw which material.

function testConfig(root: string, numCtx: number): Config {
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
    ollamaNumCtx: numCtx,
    ollamaTemperature: 0,
    ollamaTimeoutMs: 1000,
  };
}

// Classify a captured prompt by the leading words of its header.
function classify(prompt: string): 'map-qa' | 'map-chat' | 'merge' | 'reduce' | 'other' {
  if (prompt.startsWith('You are analyzing answers to an open-ended')) return 'map-qa';
  if (prompt.startsWith('You are analyzing a batch of messages')) return 'map-chat';
  if (prompt.startsWith('You are merging extracted voice/content')) return 'merge';
  if (prompt.startsWith('You are synthesizing a personality / voice profile')) return 'reduce';
  return 'other';
}

interface Capture {
  prompt: string;
  kind: ReturnType<typeof classify>;
}

// A stub generate that records every call and returns a deterministic, distinctly
// taggable bullet so we can trace observations through the tree.
function makeStub(): { fn: GenerateFn; calls: Capture[] } {
  const calls: Capture[] = [];
  let n = 0;
  const fn: GenerateFn = async (_opts: OllamaOptions, prompt: string) => {
    n++;
    const kind = classify(prompt);
    calls.push({ prompt, kind });
    if (kind === 'reduce') return '# My Soul\n\n## Tone & Register\nterse.\n';
    // map + merge both just emit a short bullet list; tag it so we can follow it.
    return `- observation ${n}`;
  };
  return { fn, calls };
}

// Build a manifest of N questionnaire chunks and write each chunk file with a
// body of the requested byte size, so map output (from the stub) is what matters
// but the source-text read in the overlap guard still works.
function setupChunks(cfg: Config, count: number, bodyBytes: number): Manifest {
  mkdirSync(cfg.chunksDir, { recursive: true });
  const chunks = [];
  for (let i = 0; i < count; i++) {
    const file = `chunk-${String(i + 1).padStart(3, '0')}.txt`;
    // Unique per-chunk body so the content-addressed map cache does not collapse
    // distinct chunks into one cached result (cache lives under .cache/bullets).
    const body =
      `# Kind: questionnaire\nchunk ${i} ${Math.random()} ` +
      'word '.repeat(Math.ceil(bodyBytes / 5));
    writeFileSync(path.join(cfg.chunksDir, file), body, 'utf8');
    chunks.push({ file, sourceFiles: [file], estimatedTokens: 0, kind: 'questionnaire' as const });
  }
  return {
    generatedAt: new Date().toISOString(),
    totalEstimatedTokens: 0,
    chunkTargetTokens: 7080,
    chunks,
  };
}

test('treeReduceBullets: small set fits → no merge level, batches returned unchanged', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'soul-tree-'));
  try {
    const cfg = testConfig(root, 8192);
    const { fn, calls } = makeStub();
    const batches = ['- a', '- b', '- c'];
    const out = await treeReduceBullets(cfg, batches, fn);
    assert.deepEqual(out, batches, 'small set returned unchanged');
    assert.equal(calls.length, 0, 'no merge generate call for a small set');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('treeReduceBullets: overflowing set → packed into N groups, MERGE per group', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'soul-tree-'));
  try {
    // Tiny num_ctx so even a handful of modest batches overflows the body budget
    // and forces partitioning into multiple groups.
    const cfg = testConfig(root, 4096);
    const { fn, calls } = makeStub();
    // 8 batches, each ~1200 bytes (~300 tok). bodyBudget = 4096-768-1024 = 2304,
    // so the full set (~2400 tok) overflows; groupBudget ≈ 4096 - mergeHeader - 1024.
    const batches = Array.from({ length: 8 }, (_, i) => `### Batch ${i}\n` + 'x'.repeat(1200));
    const out = await treeReduceBullets(cfg, batches, fn);

    const merges = calls.filter((c) => c.kind === 'merge');
    assert.ok(merges.length >= 2, `expected >= 2 merge calls, got ${merges.length}`);
    assert.ok(
      merges.every((c) => c.kind === 'merge'),
      'all intermediate calls are MERGE',
    );
    // The result must be fewer batches than the input (condensation happened).
    assert.ok(out.length < batches.length, 'tree-reduce condensed the batch count');
    // No input observation dropped: every input batch text appears in some merge prompt.
    const allMergePrompts = merges.map((c) => c.prompt).join('\n');
    for (let i = 0; i < batches.length; i++) {
      assert.ok(allMergePrompts.includes(`### Batch ${i}\n`), `batch ${i} reached a merge group`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('runOllamaPipeline: small corpus → generate called once for the final reduce (no merge)', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'soul-pipe-'));
  try {
    const cfg = testConfig(root, 8192);
    const manifest = setupChunks(cfg, 2, 200);
    const { fn, calls } = makeStub();

    await runOllamaPipeline(cfg, manifest, undefined, undefined, undefined, fn);

    const maps = calls.filter((c) => c.kind === 'map-qa' || c.kind === 'map-chat');
    const merges = calls.filter((c) => c.kind === 'merge');
    const reduces = calls.filter((c) => c.kind === 'reduce');
    assert.equal(maps.length, 2, 'one map per chunk');
    assert.equal(merges.length, 0, 'no intermediate merge level for a small corpus');
    assert.equal(reduces.length, 1, 'exactly one final reduce');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('runOllamaPipeline: large corpus → merge runs, then a final reduce; nothing dropped', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'soul-pipe-'));
  try {
    // Small num_ctx + many chunks → the accumulated map bullets overflow the
    // final-reduce body budget, triggering the tree-reduce.
    const cfg = testConfig(root, 4096);
    const manifest = setupChunks(cfg, 20, 100);
    // The stub returns a ~600-byte bullet per map call so 20 batches (~3000 tok)
    // overflow bodyBudget (4096-768-1024 = 2304).
    const calls: Capture[] = [];
    let n = 0;
    const fn: GenerateFn = async (_opts, prompt) => {
      n++;
      const kind = classify(prompt);
      calls.push({ prompt, kind });
      if (kind === 'reduce') return '# My Soul\n\n## Tone & Register\nterse.\n';
      return `- observation number ${n} ` + 'detail '.repeat(80);
    };

    await runOllamaPipeline(cfg, manifest, undefined, undefined, undefined, fn);

    const maps = calls.filter((c) => c.kind === 'map-qa' || c.kind === 'map-chat');
    const merges = calls.filter((c) => c.kind === 'merge');
    const reduces = calls.filter((c) => c.kind === 'reduce');
    assert.equal(maps.length, 20, 'one map per chunk');
    assert.ok(merges.length >= 1, `expected >= 1 merge call, got ${merges.length}`);
    assert.equal(reduces.length, 1, 'exactly one final reduce after merging');

    // Nothing dropped: every map output (observation 1..20) reached a merge prompt.
    const allMerge = merges.map((c) => c.prompt).join('\n');
    for (let i = 1; i <= 20; i++) {
      assert.ok(allMerge.includes(`observation number ${i} `), `map output ${i} reached merge`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('profile + rejected batches appear ONLY in the final reduce, never in a merge group', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'soul-pipe-'));
  try {
    const cfg = testConfig(root, 4096);
    const manifest = setupChunks(cfg, 20, 100);
    const calls: Capture[] = [];
    let n = 0;
    const fn: GenerateFn = async (_opts, prompt) => {
      n++;
      const kind = classify(prompt);
      calls.push({ prompt, kind });
      if (kind === 'reduce') return '# My Soul\n\n## Tone & Register\nterse.\n';
      return `- observation number ${n} ` + 'detail '.repeat(80);
    };

    const PROFILE = 'PROFILE_MARKER_openness_high';
    const REJECTED = ['REJECTED_MARKER_i_love_small_talk'];
    await runOllamaPipeline(cfg, manifest, undefined, PROFILE, REJECTED, fn);

    const merges = calls.filter((c) => c.kind === 'merge');
    const reduces = calls.filter((c) => c.kind === 'reduce');
    assert.ok(merges.length >= 1, 'tree-reduce ran (merge present)');
    assert.equal(reduces.length, 1, 'one final reduce');

    for (const m of merges) {
      assert.ok(!m.prompt.includes(PROFILE), 'profile must NOT appear in a merge prompt');
      assert.ok(
        !m.prompt.includes('REJECTED_MARKER'),
        'rejected must NOT appear in a merge prompt',
      );
      assert.ok(
        !m.prompt.includes('Self-Reported Personality Profile'),
        'profile batch header must NOT appear in a merge prompt',
      );
    }
    const reducePrompt = reduces[0].prompt;
    assert.ok(reducePrompt.includes(PROFILE), 'profile appears in the final reduce');
    assert.ok(reducePrompt.includes('REJECTED_MARKER'), 'rejected appears in the final reduce');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
