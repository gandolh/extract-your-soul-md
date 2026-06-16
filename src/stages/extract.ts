import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { color } from '../color.js';
import type { Config } from '../config.js';
import type { Manifest, ChunkKind } from './chunk.js';
import { generate } from '../ollama.js';
import { estimateTokens } from '../tokens.js';
import { MAP_PROMPT_HEADER, MAP_PROMPT_HEADER_QA, REDUCE_PROMPT_HEADER } from '../prompts.js';

function hash(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

// Backstop against silent truncation: Ollama discards anything past `num_ctx`
// without error, so a prompt that overflows produces confident garbage. Fail
// loudly instead. The chunk budget (chunk.ts) should keep map prompts in range;
// this catches stale manifests, header growth, and the unbounded reduce prompt.
function assertFitsContext(label: string, prompt: string, numCtx: number): void {
  const tokens = estimateTokens(prompt);
  if (tokens > numCtx) {
    throw new Error(
      `${label} prompt is ~${tokens} tokens but OLLAMA_NUM_CTX=${numCtx}. ` +
        `Ollama would silently truncate it. ` +
        `Re-run the chunk stage, raise OLLAMA_NUM_CTX, or (for reduce) split the bullet set.`,
    );
  }
}

async function extractChunk(
  cfg: Config,
  chunkPath: string,
  cacheDir: string,
  kind: ChunkKind,
): Promise<string> {
  const content = readFileSync(chunkPath, 'utf8');
  const header = kind === 'questionnaire' ? MAP_PROMPT_HEADER_QA : MAP_PROMPT_HEADER;
  // Fingerprint the cache by everything that affects the extraction: kind,
  // model, context window, temperature, the live prompt header (hashed so prompt
  // edits auto-invalidate without a hand-bumped version constant), and content.
  // Seed is intentionally excluded — it's a fixed constant.
  const headerHash = hash(header);
  const key = hash(
    `${kind}\n${cfg.ollamaModel}\n${cfg.ollamaNumCtx}\n${cfg.ollamaTemperature}\n${headerHash}\n${content}`,
  );
  const cachePath = path.join(cacheDir, `${key}.txt`);
  if (existsSync(cachePath)) {
    return readFileSync(cachePath, 'utf8');
  }
  const prompt = header + content;
  assertFitsContext(`map (${kind})`, prompt, cfg.ollamaNumCtx);
  const out = await generate(
    {
      host: cfg.ollamaHost,
      model: cfg.ollamaModel,
      numCtx: cfg.ollamaNumCtx,
      temperature: cfg.ollamaTemperature,
    },
    prompt,
  );
  writeFileSync(cachePath, out, 'utf8');
  return out;
}

export async function runOllamaPipeline(cfg: Config, manifest: Manifest): Promise<string> {
  const chunksDir = path.resolve(cfg.chunksDir);
  const cacheDir = path.resolve('.cache', 'bullets');
  mkdirSync(cacheDir, { recursive: true });

  const bullets: string[] = [];
  for (let i = 0; i < manifest.chunks.length; i++) {
    const entry = manifest.chunks[i];
    const kindTag = entry.kind === 'questionnaire' ? color.magenta('Q&A') : color.blue('chat');
    process.stdout.write(
      `  ${kindTag} ${color.yellow(`${i + 1}/${manifest.chunks.length}`)} (${color.cyan(entry.file)})... `,
    );
    const t0 = Date.now();
    const out = await extractChunk(cfg, path.join(chunksDir, entry.file), cacheDir, entry.kind);
    process.stdout.write(color.dim(`${((Date.now() - t0) / 1000).toFixed(1)}s\n`));
    const sourceLabel =
      entry.kind === 'questionnaire'
        ? `questionnaire`
        : `chat logs: ${entry.sourceFiles.join(', ')}`;
    bullets.push(`### Batch ${i + 1} (from ${sourceLabel})\n${out.trim()}`);
  }

  process.stdout.write(`  ${color.magenta('reduce')}... `);
  const t0 = Date.now();
  const reducePrompt = REDUCE_PROMPT_HEADER + bullets.join('\n\n');
  assertFitsContext('reduce', reducePrompt, cfg.ollamaNumCtx);
  const soul = await generate(
    {
      host: cfg.ollamaHost,
      model: cfg.ollamaModel,
      numCtx: cfg.ollamaNumCtx,
      temperature: cfg.ollamaTemperature,
    },
    reducePrompt,
  );
  process.stdout.write(color.dim(`${((Date.now() - t0) / 1000).toFixed(1)}s\n`));

  const outDir = path.resolve(cfg.outDir);
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'my-soul.md');
  if (existsSync(outPath)) {
    const backupPath = path.join(outDir, 'my-soul.prev.md');
    copyFileSync(outPath, backupPath);
  }
  writeFileSync(outPath, soul.trim() + '\n', 'utf8');
  return outPath;
}
