import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { color } from '../color.js';
import type { Config } from '../config.js';
import type { Manifest, ChunkKind } from './chunk.js';
import { generate } from '../ollama.js';
import { estimateTokens } from '../tokens.js';
import { MAP_PROMPT_HEADER, MAP_PROMPT_HEADER_QA, buildReducePrompt } from '../prompts.js';
import { findVerbatimOverlap, DEFAULT_NGRAM } from '../regurgitation.js';

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

// Fixed seed for deterministic extraction. Voice extraction is analysis, not
// creative writing — a constant seed (with temperature 0) makes a prompt edit's
// effect attributable instead of lost in run-to-run noise. Invariant, so it does
// not enter the cache key. Best-effort: GPU nondeterminism can still leak.
const EXTRACTION_SEED = 42;

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
      seed: EXTRACTION_SEED,
      apiKey: cfg.ollamaApiKey,
      timeoutMs: cfg.ollamaTimeoutMs,
    },
    prompt,
  );
  writeFileSync(cachePath, out, 'utf8');
  return out;
}

/** Reported as the pipeline advances, so a caller (the web job model) can persist
 * progress. `stage` is 'map' while extracting chunks, 'reduce' for synthesis. */
export type ProgressFn = (stage: 'map' | 'reduce', done: number, total: number) => void;

export async function runOllamaPipeline(
  cfg: Config,
  manifest: Manifest,
  onProgress?: ProgressFn,
  // Pre-rendered self-reported trait profile (the included reports). Appended
  // as a final batch and weighted DOWN by the reduce prompt — see prompts.ts.
  // Empty/undefined → no profile block, prompt unchanged.
  profileText?: string,
  // Swipe statements the user rejected ("not like me"). Appended as a final
  // batch and treated as anti-patterns by the reduce prompt. Empty → unchanged.
  rejectedStatements?: ReadonlyArray<string>,
): Promise<string> {
  const chunksDir = path.resolve(cfg.chunksDir);
  const cacheDir = path.resolve('.cache', 'bullets');
  mkdirSync(cacheDir, { recursive: true });

  const total = manifest.chunks.length;
  const bullets: string[] = [];
  for (let i = 0; i < manifest.chunks.length; i++) {
    const entry = manifest.chunks[i];
    const kindTag = entry.kind === 'questionnaire' ? color.magenta('Q&A') : color.blue('chat');
    process.stdout.write(
      `  ${kindTag} ${color.yellow(`${i + 1}/${total}`)} (${color.cyan(entry.file)})... `,
    );
    onProgress?.('map', i, total);
    const t0 = Date.now();
    let out: string;
    try {
      out = await extractChunk(cfg, path.join(chunksDir, entry.file), cacheDir, entry.kind);
    } catch (err) {
      // Name the failing chunk so the job's error log isn't a context-free
      // "fetch failed" — which of N chunks died matters when debugging.
      process.stdout.write(color.dim('failed\n'));
      throw new Error(
        `Map phase failed on chunk ${i + 1}/${total} (${entry.file}, ${entry.kind})`,
        { cause: err },
      );
    }
    process.stdout.write(color.dim(`${((Date.now() - t0) / 1000).toFixed(1)}s\n`));
    const sourceLabel =
      entry.kind === 'questionnaire'
        ? `questionnaire`
        : `chat logs: ${entry.sourceFiles.join(', ')}`;
    bullets.push(`### Batch ${i + 1} (from ${sourceLabel})\n${out.trim()}`);
  }

  // The opted-in self-reported trait profile goes in as a final, clearly-labeled
  // batch so the reduce step sees it alongside the observed-voice bullets.
  const profile = profileText?.trim();
  if (profile) {
    bullets.push(`### Self-Reported Personality Profile (validated trait questionnaires — a collaborator with the observed voice)\n${profile}`);
  }

  // Rejected swipe statements go in as a final batch the reduce prompt treats as
  // anti-patterns (REDUCE_REJECTED_RULE) — steer away from, never invert.
  const rejected = (rejectedStatements ?? []).map((s) => s.trim()).filter((s) => s.length > 0);
  if (rejected.length > 0) {
    bullets.push(
      `### Statements the user rejected as NOT like them (anti-patterns — do not attribute these traits)\n` +
        rejected.map((s) => `- ${s}`).join('\n'),
    );
  }

  onProgress?.('map', total, total);
  process.stdout.write(`  ${color.magenta('reduce')}... `);
  onProgress?.('reduce', 0, 1);
  const t0 = Date.now();
  const hasQuestionnaire = manifest.chunks.some((c) => c.kind === 'questionnaire');
  const reducePrompt =
    buildReducePrompt(hasQuestionnaire, Boolean(profile), rejected.length > 0) + bullets.join('\n\n');
  assertFitsContext('reduce', reducePrompt, cfg.ollamaNumCtx);
  const soul = await generate(
    {
      host: cfg.ollamaHost,
      model: cfg.ollamaModel,
      numCtx: cfg.ollamaNumCtx,
      temperature: cfg.ollamaTemperature,
      seed: EXTRACTION_SEED,
      apiKey: cfg.ollamaApiKey,
      timeoutMs: cfg.ollamaTimeoutMs,
    },
    reducePrompt,
  );
  process.stdout.write(color.dim(`${((Date.now() - t0) / 1000).toFixed(1)}s\n`));

  // Verbatim-overlap guard: flag any long (DEFAULT_NGRAM-word) run that leaked
  // from the private source into the profile. Log + warn only — soul.md is
  // written unchanged; the manual-review gate (gitignore + eyeball) acts on it.
  // Source is the raw chunk text, minus the questionnaire instruction header
  // (lines starting with '#' are OUR scaffolding, not the user's words).
  const sourceText = manifest.chunks
    .map((entry) => {
      const raw = readFileSync(path.join(chunksDir, entry.file), 'utf8');
      return entry.kind === 'questionnaire'
        ? raw
            .split('\n')
            .filter((l) => !l.startsWith('#'))
            .join('\n')
        : raw;
    })
    .join('\n');
  const overlap = findVerbatimOverlap(soul, sourceText, DEFAULT_NGRAM);
  if (overlap.hits.length > 0) {
    process.stdout.write(
      color.yellow(
        `  ⚠ regurgitation: ${overlap.hits.length} verbatim ${overlap.ngram}-gram` +
          `${overlap.hits.length === 1 ? '' : 's'} from your source leaked into the profile. ` +
          `Review out/my-soul.md before downstream use.\n`,
      ),
    );
    for (const hit of overlap.hits.slice(0, 10)) {
      process.stdout.write(color.dim(`      “…${hit.shingle}…”\n`));
    }
    if (overlap.hits.length > 10) {
      process.stdout.write(color.dim(`      …and ${overlap.hits.length - 10} more\n`));
    }
  }

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
