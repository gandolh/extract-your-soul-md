import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import chalk from 'chalk';
import type { Config } from '../config.js';
import type { Manifest } from './chunk.js';
import { generate } from '../ollama.js';
import { MAP_PROMPT_HEADER, REDUCE_PROMPT_HEADER } from '../prompts.js';

function hash(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

async function extractChunk(cfg: Config, chunkPath: string, cacheDir: string): Promise<string> {
  const content = readFileSync(chunkPath, 'utf8');
  const key = hash(content);
  const cachePath = path.join(cacheDir, `${key}.txt`);
  if (existsSync(cachePath)) {
    return readFileSync(cachePath, 'utf8');
  }
  const prompt = MAP_PROMPT_HEADER + content;
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
    process.stdout.write(
      `  ${chalk.blue('map')} ${chalk.yellow(`${i + 1}/${manifest.chunks.length}`)} (${chalk.cyan(entry.file)})... `,
    );
    const t0 = Date.now();
    const out = await extractChunk(cfg, path.join(chunksDir, entry.file), cacheDir);
    process.stdout.write(chalk.dim(`${((Date.now() - t0) / 1000).toFixed(1)}s\n`));
    bullets.push(`### Batch ${i + 1} (from ${entry.sourceFiles.join(', ')})\n${out.trim()}`);
  }

  process.stdout.write(`  ${chalk.magenta('reduce')}... `);
  const t0 = Date.now();
  const reducePrompt = REDUCE_PROMPT_HEADER + bullets.join('\n\n');
  const soul = await generate(
    {
      host: cfg.ollamaHost,
      model: cfg.ollamaModel,
      numCtx: cfg.ollamaNumCtx,
      temperature: cfg.ollamaTemperature,
    },
    reducePrompt,
  );
  process.stdout.write(chalk.dim(`${((Date.now() - t0) / 1000).toFixed(1)}s\n`));

  const outDir = path.resolve(cfg.outDir);
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'my-soul.md');
  writeFileSync(outPath, soul.trim() + '\n', 'utf8');
  return outPath;
}
