// Per-user eval harness: measures whether the user's style-card (soul.md) beats
// raw text examples at making the local model continue text in the user's voice.
// Holds out N of the user's real messages, generates a continuation of each
// under three conditions, and scores each against the real continuation with the
// local stylometric metrics in ../eval.ts.
//
//   A = soul.md spec only · B = k raw example messages only · C = spec + examples
//
// Synchronous like /api/extract (an Ollama run is minutes); guarded by an
// in-memory per-user lock. Generations are cached by content-hash so re-runs at
// the same config are instant and deterministic (temp 0 + fixed seed).

import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { Config } from '../config.js';
import { generate } from '../ollama.js';
import { processAll, QUESTIONNAIRE_PROCESSED_FILENAME } from '../stages/process.js';
import { getConversationContents, getLatestResult, getNames } from '../db/repos.js';
import { type MetricBundle, scoreAgainst, averageBundles } from '../eval.js';

// Same fixed seed as extraction — eval must be deterministic to be a clean A/B
// signal across prompt/model/temperature changes.
const EVAL_SEED = 42;

export type Condition = 'A' | 'B' | 'C';
export const CONDITIONS: Condition[] = ['A', 'B', 'C'];

export const CONDITION_LABELS: Record<Condition, string> = {
  A: 'soul.md spec only',
  B: 'raw examples only',
  C: 'spec + examples',
};

export class EvalBusyError extends Error {}
export class NothingToEvalError extends Error {}

const running = new Set<number>();
export function isEvaluating(userId: number): boolean {
  return running.has(userId);
}

export interface EvalSample {
  prefix: string;
  realContinuation: string;
  generated: Record<Condition, string>;
  scores: Record<Condition, MetricBundle>;
}

export interface EvalResult {
  n: number;
  k: number;
  conditionLabels: Record<Condition, string>;
  aggregate: Record<Condition, MetricBundle>;
  samples: EvalSample[];
}

interface EvalParams {
  n?: number;
  k?: number;
}

function hash(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

// Split a message into a prefix to feed the model and the real continuation to
// score against. Word-bounded ~60% prefix; only usable if both halves are
// substantial enough to carry a stylometric signal.
function splitForContinuation(msg: string): { prefix: string; continuation: string } | null {
  const words = msg.trim().split(/\s+/);
  if (words.length < 12) return null;
  const cut = Math.max(4, Math.floor(words.length * 0.6));
  const prefix = words.slice(0, cut).join(' ');
  const continuation = words.slice(cut).join(' ');
  if (continuation.length < 20) return null;
  return { prefix, continuation };
}

function buildPrompt(
  condition: Condition,
  prefix: string,
  soulMd: string,
  examples: string[],
): string {
  const task =
    `Continue the following message in the exact same voice and style. ` +
    `Write only the continuation — no preamble, no quotes.\n\nMessage so far:\n${prefix}\n\nContinuation:`;
  if (condition === 'A') {
    return `Here is a description of the author's writing voice:\n\n${soulMd}\n\n${task}`;
  }
  if (condition === 'B') {
    return `Here are example messages written by the author:\n\n${examples.join('\n')}\n\n${task}`;
  }
  return (
    `Here is a description of the author's writing voice:\n\n${soulMd}\n\n` +
    `Here are example messages by the same author:\n\n${examples.join('\n')}\n\n${task}`
  );
}

/** Read the user's own messages from a processed work dir, one cleaned message
 *  per line, excluding the questionnaire file. */
function readProcessedMessages(processedDir: string): string[] {
  if (!existsSync(processedDir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(processedDir).sort()) {
    if (name === QUESTIONNAIRE_PROCESSED_FILENAME) continue;
    if (!/\.txt$/i.test(name)) continue;
    const lines = readFileSync(path.join(processedDir, name), 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    out.push(...lines);
  }
  return out;
}

export async function runUserEval(
  baseCfg: Config,
  userId: number,
  params: EvalParams = {},
): Promise<EvalResult> {
  if (running.has(userId)) throw new EvalBusyError('Eval already running.');

  const n = Math.min(50, Math.max(1, Math.floor(params.n ?? baseCfg.evalHoldoutN)));
  const k = Math.min(20, Math.max(1, Math.floor(params.k ?? baseCfg.evalRawK)));

  const latest = getLatestResult(userId);
  if (!latest?.soul_md?.trim()) {
    throw new NothingToEvalError('Generate your soul.md profile first — the eval needs it for the spec-only condition.');
  }
  const soulMd = latest.soul_md;

  running.add(userId);
  const workRoot = path.resolve(baseCfg.workDir);
  mkdirSync(workRoot, { recursive: true });
  const work = mkdtempSync(path.join(workRoot, `eval-u${userId}-`));

  const cfg: Config = {
    ...baseCfg,
    inputsFreeformDir: path.join(work, 'freeform'),
    inputsProcessedDir: path.join(work, 'processed'),
  };

  try {
    // Materialize conversations → filter to the user's own messages (same path
    // extraction uses), so the holdout is genuinely the user's voice.
    mkdirSync(cfg.inputsFreeformDir, { recursive: true });
    const convos = getConversationContents(userId);
    if (convos.length === 0) {
      throw new NothingToEvalError('Import at least one conversation — the eval scores against your real messages.');
    }
    const globalNames = getNames(userId);
    const namesByFile = new Map<string, Set<string>>();
    for (const conv of convos) {
      const safe = `${conv.id}-${path.basename(conv.filename).replace(/[^\w.\- ]/g, '_')}`;
      writeFileSync(path.join(cfg.inputsFreeformDir, safe), conv.content, 'utf8');
      namesByFile.set(safe, new Set(conv.names ?? globalNames));
    }
    processAll(cfg, (filename) => namesByFile.get(filename) ?? new Set(globalNames));

    const messages = readProcessedMessages(cfg.inputsProcessedDir);
    const splittable = messages
      .map((m) => splitForContinuation(m))
      .filter((s): s is { prefix: string; continuation: string } => s !== null);

    // Need enough usable messages for n holdout + k examples (disjoint).
    if (splittable.length < n + k) {
      throw new NothingToEvalError(
        `Not enough usable messages to eval (need ${n + k} substantial ones, found ${splittable.length}). Import more conversation history.`,
      );
    }

    const holdout = splittable.slice(0, n);
    const examplePool = messages.slice(n); // raw (unsplit) messages, disjoint from holdout
    const examples = examplePool.slice(0, k);

    const cacheDir = path.resolve('.cache', 'eval');
    mkdirSync(cacheDir, { recursive: true });

    const samples: EvalSample[] = [];
    for (const { prefix, continuation } of holdout) {
      const generated = {} as Record<Condition, string>;
      const scores = {} as Record<Condition, MetricBundle>;
      for (const condition of CONDITIONS) {
        const prompt = buildPrompt(condition, prefix, soulMd, examples);
        const key = hash(
          `eval\n${condition}\n${cfg.ollamaModel}\n${cfg.ollamaNumCtx}\n${cfg.ollamaTemperature}\n${prompt}`,
        );
        const cachePath = path.join(cacheDir, `${key}.txt`);
        let out: string;
        if (existsSync(cachePath)) {
          out = readFileSync(cachePath, 'utf8');
        } else {
          out = await generate(
            {
              host: cfg.ollamaHost,
              model: cfg.ollamaModel,
              numCtx: cfg.ollamaNumCtx,
              temperature: cfg.ollamaTemperature,
              seed: EVAL_SEED,
              apiKey: cfg.ollamaApiKey,
              timeoutMs: cfg.ollamaTimeoutMs,
            },
            prompt,
          );
          writeFileSync(cachePath, out, 'utf8');
        }
        generated[condition] = out.trim();
        scores[condition] = scoreAgainst(continuation, out.trim());
      }
      samples.push({ prefix, realContinuation: continuation, generated, scores });
    }

    const aggregate = {} as Record<Condition, MetricBundle>;
    for (const condition of CONDITIONS) {
      aggregate[condition] = averageBundles(samples.map((s) => s.scores[condition]));
    }

    return { n, k, conditionLabels: CONDITION_LABELS, aggregate, samples };
  } finally {
    rmSync(work, { recursive: true, force: true });
    running.delete(userId);
  }
}
