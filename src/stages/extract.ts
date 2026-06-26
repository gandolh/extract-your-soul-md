import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { color } from '../color.js';
import type { Config } from '../config.js';
import { generate } from '../ollama.js';
import {
  buildReducePrompt,
  MAP_PROMPT_HEADER,
  MAP_PROMPT_HEADER_QA,
  MERGE_BULLETS_HEADER,
} from '../prompts.js';
import { DEFAULT_NGRAM, findVerbatimOverlap, type OverlapReport } from '../regurgitation.js';
import { estimateTokens } from '../tokens.js';
import type { ChunkKind, Manifest } from './chunk.js';

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

// Reserve, inside `num_ctx`, the room the FINAL reduce needs on top of the
// bullet body: the full `buildReducePrompt(...)` scaffolding (≈575 tok, brief
// 02) plus the generated soul.md output. Used to decide when the bullet set is
// "too big for a single reduce" and a tree-reduce level must run first. Generous
// — overcounting only makes us merge a touch earlier, which is the safe side.
const REDUCE_HEADER_RESERVE = 768;
const REDUCE_OUTPUT_RESERVE = 1024;

// The injectable shape of ../ollama.js `generate`. The pipeline + tree-reduce
// take an optional `generateFn` defaulting to the real `generate`, so unit tests
// can drive the partitioning logic with a stub and no live Ollama. Minimal seam
// by design (brief 39) — no DI container, just a function parameter.
export type GenerateFn = typeof generate;

async function extractChunk(
  cfg: Config,
  chunkPath: string,
  cacheDir: string,
  kind: ChunkKind,
  generateFn: GenerateFn,
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
  const out = await generateFn(
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

/**
 * Hierarchical tree-reduce (brief 39). Lifts the reduce-prompt `num_ctx` ceiling
 * that brief 02's `assertFitsContext('reduce', …)` backstop merely *detected*.
 *
 * Given the per-chunk map-bullet batches (NOT the profile / rejected batches —
 * those are final-reduce-only), this returns a bullet-batch list small enough
 * that the final reduce prompt fits `num_ctx`:
 *
 *  - If `MERGE_BULLETS_HEADER + batches` already leaves room for the final reduce
 *    (header + output reserve), the batches are returned unchanged — a small
 *    corpus pays NOTHING (no `generate` call here at all).
 *  - Otherwise the batches are greedily packed into `num_ctx`-fitting groups
 *    (using the same `estimateTokens` byte heuristic as chunk.ts / brief 33),
 *    each group is condensed by one `MERGE_BULLETS_HEADER` `generate` call, and
 *    the resulting intermediate summaries are recursed on until one level fits.
 *
 * The MERGE prompt only dedups/condenses bullets — it never emits soul.md
 * sections or sees the profile/rejected material — so the conditional-section
 * behavior (briefs 26/27/28) is untouched; that all lives in the final reduce.
 *
 * Determinism: every intermediate call uses the same `EXTRACTION_SEED` +
 * `cfg.ollamaTemperature` as the map/reduce calls. Intermediate reduces are NOT
 * cached (reduce isn't cached today; only the per-chunk map results are).
 *
 * `onMergeProgress(done, total)` is invoked once per merge `generate` call so the
 * caller can surface tree-reduce progress under the existing `'reduce'` stage
 * without changing the `ProgressFn` signature.
 */
export async function treeReduceBullets(
  cfg: Config,
  batches: ReadonlyArray<string>,
  generateFn: GenerateFn = generate,
  onMergeProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  // The body must leave room for the final reduce's header + generated output.
  const bodyBudget = cfg.ollamaNumCtx - REDUCE_HEADER_RESERVE - REDUCE_OUTPUT_RESERVE;

  const fits = (parts: ReadonlyArray<string>): boolean =>
    estimateTokens(parts.join('\n\n')) <= bodyBudget;

  // Already fits → no intermediate level; the final reduce handles it directly.
  if (batches.length <= 1 || fits(batches)) {
    return [...batches];
  }

  // The merge group's own budget: a group's bullets + the MERGE header must fit
  // num_ctx, with room for the merge output. We reuse REDUCE_OUTPUT_RESERVE as a
  // generous output allowance for the condensed list. Cap it at `bodyBudget`:
  // a group bigger than what the final reduce can hold would never make progress
  // (one merge group == the whole overflowing set), so groups must be strictly
  // smaller than the target the next level needs to fit.
  const mergeHeaderTokens = estimateTokens(MERGE_BULLETS_HEADER);
  const groupBudget = Math.min(
    cfg.ollamaNumCtx - mergeHeaderTokens - REDUCE_OUTPUT_RESERVE,
    bodyBudget,
  );

  // Greedily pack batches into num_ctx-fitting groups. A single batch larger than
  // the group budget can't be split here (it's an already-mapped ~200-tok bullet
  // blob, far under budget in practice) — it gets its own group and the
  // final-reduce backstop still guards true pathological overflow.
  const groups: string[][] = [];
  let current: string[] = [];
  let currentTokens = 0;
  for (const batch of batches) {
    const t = estimateTokens(batch) + estimateTokens('\n\n');
    if (current.length > 0 && currentTokens + t > groupBudget) {
      groups.push(current);
      current = [];
      currentTokens = 0;
    }
    current.push(batch);
    currentTokens += t;
  }
  if (current.length > 0) groups.push(current);

  // Degenerate safety: if everything packed into one group (e.g. budgets are so
  // tight a single group equals all batches), splitting further is impossible —
  // return as-is and let the final-reduce backstop report the overflow rather
  // than spin forever.
  if (groups.length <= 1) {
    return [...batches];
  }

  const merged: string[] = [];
  for (let i = 0; i < groups.length; i++) {
    const prompt = MERGE_BULLETS_HEADER + groups[i].join('\n\n');
    assertFitsContext('merge', prompt, cfg.ollamaNumCtx);
    const out = await generateFn(
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
    merged.push(out.trim());
    onMergeProgress?.(i + 1, groups.length);
  }

  // Recurse: the merged summaries are themselves bullet batches. They are
  // strictly fewer/shorter than the input (each group collapsed to one), so this
  // terminates.
  return treeReduceBullets(cfg, merged, generateFn, onMergeProgress);
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
  // Injection seam for tests (brief 39): the `generate` implementation. Defaults
  // to the real ../ollama.js `generate`; a stub lets unit tests exercise the
  // map / tree-reduce / final-reduce flow with no live Ollama.
  generateFn: GenerateFn = generate,
): Promise<{ outPath: string; overlap: OverlapReport }> {
  const chunksDir = path.resolve(cfg.chunksDir);
  const cacheDir = path.resolve('.cache', 'bullets');
  mkdirSync(cacheDir, { recursive: true });

  const total = manifest.chunks.length;
  // The per-chunk map bullets. These are the ONLY batches that feed the
  // tree-reduce; the profile + rejected batches below are final-reduce-only.
  const chunkBullets: string[] = [];
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
      out = await extractChunk(
        cfg,
        path.join(chunksDir, entry.file),
        cacheDir,
        entry.kind,
        generateFn,
      );
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
    chunkBullets.push(`### Batch ${i + 1} (from ${sourceLabel})\n${out.trim()}`);
  }

  onProgress?.('map', total, total);

  // Hierarchical tree-reduce (brief 39): if the chunk bullets + the final reduce
  // header/output would overflow `num_ctx`, condense them into fewer batches via
  // intermediate MERGE_BULLETS passes first. A small corpus skips this entirely
  // (treeReduceBullets returns the batches unchanged, no extra generate call).
  // The profile + rejected batches are NOT fed here — they are final-reduce-only,
  // so the conditional-section logic stays intact.
  onProgress?.('reduce', 0, 1);
  const reducedBullets = await treeReduceBullets(cfg, chunkBullets, generateFn, () => {
    // Tree-reduce levels are surfaced under the existing 'reduce' stage rather
    // than a new ProgressFn stage (would ripple into the job consumer in
    // routes/results.ts). Kept coarse — still 'reduce', not yet done.
    onProgress?.('reduce', 0, 1);
  });

  // Final-reduce-only batches. The opted-in self-reported trait profile goes in
  // as a clearly-labeled batch so the reduce step sees it alongside the observed
  // voice; it never participates in a merge level.
  const finalBatches = [...reducedBullets];
  const profile = profileText?.trim();
  if (profile) {
    finalBatches.push(
      `### Self-Reported Personality Profile (validated trait questionnaires — a collaborator with the observed voice)\n${profile}`,
    );
  }

  // Rejected swipe statements go in as a final batch the reduce prompt treats as
  // anti-patterns (REDUCE_REJECTED_RULE) — steer away from, never invert. Also
  // final-reduce-only.
  const rejected = (rejectedStatements ?? []).map((s) => s.trim()).filter((s) => s.length > 0);
  if (rejected.length > 0) {
    finalBatches.push(
      `### Statements the user rejected as NOT like them (anti-patterns — do not attribute these traits)\n` +
        rejected.map((s) => `- ${s}`).join('\n'),
    );
  }

  process.stdout.write(`  ${color.magenta('reduce')}... `);
  const t0 = Date.now();
  const hasQuestionnaire = manifest.chunks.some((c) => c.kind === 'questionnaire');
  const reducePrompt =
    buildReducePrompt(hasQuestionnaire, Boolean(profile), rejected.length > 0) +
    finalBatches.join('\n\n');
  assertFitsContext('reduce', reducePrompt, cfg.ollamaNumCtx);
  const soul = await generateFn(
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
          `Review the profile before downstream use.\n`,
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
  return { outPath, overlap };
}
