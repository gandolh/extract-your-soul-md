// Per-user extraction: materialize a throwaway work dir from the user's DB
// rows, run the file-based pipeline (process → chunk → ollama) against it, then
// read the result back into SQLite. This is the only extraction path — the
// project is API + frontend only and extraction is always Ollama.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Config } from '../config.js';
import { writeAnswersFile } from '../answers-file.js';
import { processAll } from '../stages/process.js';
import { chunkAll } from '../stages/chunk.js';
import { runOllamaPipeline } from '../stages/extract.js';
import { pingOllama, OllamaUnavailableError } from '../ollama.js';
import {
  getAnswersForUser,
  getConversationContents,
  getLatestResult,
  getNames,
  hasConversations,
  saveResult,
  startJob,
  updateJobProgress,
} from '../db/repos.js';
import { readFileSync } from 'node:fs';

export class NothingToExtractError extends Error {}
// A conversation parsed fine but none of its senders matched the user's "you"
// names — the voice filter would silently yield an empty profile. Fail loudly.
export class NamesMismatchError extends Error {}

/** True if the user has any material (answers or conversations) to extract. */
export function hasExtractableInput(userId: number): boolean {
  if (hasConversations(userId)) return true;
  return getAnswersForUser(userId).some((a) => a.body.trim().length > 0);
}

/**
 * Run extraction for an already-created job row. The route creates the job
 * (acquiring the DB lock) and fires this via setImmediate; this writes the work
 * dir onto the job, drives progress, and persists the result. Throws on failure
 * so the route's catch can mark the job failed — but ALWAYS removes the work dir.
 */
export async function runUserExtraction(
  baseCfg: Config,
  userId: number,
  jobId: number,
): Promise<string> {
  if (!hasExtractableInput(userId)) {
    throw new NothingToExtractError('Fill in at least one study answer or import a conversation first.');
  }

  // Preflight: fail fast (before any mkdir/process work) if Ollama is down or the
  // model isn't pulled — otherwise we'd process → chunk and only discover it on
  // the first generate(). The ping's reason carries the friendly message.
  const ready = await pingOllama({
    host: baseCfg.ollamaHost,
    model: baseCfg.ollamaModel,
    apiKey: baseCfg.ollamaApiKey,
  });
  if (!ready.ok) {
    throw new OllamaUnavailableError(baseCfg.ollamaHost, { cause: ready.reason });
  }

  const workRoot = path.resolve(baseCfg.workDir);
  mkdirSync(workRoot, { recursive: true });
  const work = mkdtempSync(path.join(workRoot, `u${userId}-`));
  // Record the dir on the job immediately so a crash leaves a reclaimable trail.
  startJob(jobId, work);

  // A per-run Config clone with every path made absolute and pointed into the
  // work dir. The base config is frozen — this spread is a fresh object.
  const cfg: Config = {
    ...baseCfg,
    inputsFreeformDir: path.join(work, 'freeform'),
    inputsProcessedDir: path.join(work, 'processed'),
    chunksDir: path.join(work, 'chunks'),
    outDir: path.join(work, 'out'),
    questionnaireDir: path.join(work, 'questionnaire'),
    questionnaireFile: 'answers.md',
  };

  try {
    // 1. Conversations → work/freeform/<filename>
    mkdirSync(cfg.inputsFreeformDir, { recursive: true });
    for (const conv of getConversationContents(userId)) {
      const safe = path.basename(conv.filename).replace(/[^\w.\- ]/g, '_');
      writeFileSync(path.join(cfg.inputsFreeformDir, safe), conv.content, 'utf8');
    }

    // 2. Study answers → work/questionnaire/answers.md (UNCHANGED writer).
    mkdirSync(cfg.questionnaireDir, { recursive: true });
    writeAnswersFile(
      path.join(cfg.questionnaireDir, cfg.questionnaireFile),
      getAnswersForUser(userId),
      'web extraction',
    );

    // 3. Existing pipeline.
    const myNames = new Set(getNames(userId));
    const stats = processAll(cfg, myNames);

    // Guard the load-bearing voice filter: if a conversation parsed lines but
    // none matched the user's names, the profile would be silently empty.
    const mismatched = stats.perSource.filter((s) => s.parsedSenders.length > 0 && s.myLinesIn === 0);
    if (mismatched.length > 0 && stats.myLinesIn === 0) {
      const senders = [...new Set(mismatched.flatMap((s) => s.parsedSenders))].slice(0, 20);
      throw new NamesMismatchError(
        `None of your imported messages matched your names. Senders found in the export: ${senders.join(', ')}. ` +
          `Add the exact name that appears as "you" to your names list and re-run.`,
      );
    }

    const manifest = chunkAll(cfg);
    const outPath = await runOllamaPipeline(cfg, manifest, (stage, done, total) =>
      updateJobProgress(jobId, stage, done, total),
    );
    const soulMd = readFileSync(outPath, 'utf8');

    // 4. Persist; carry the prior soul.md into prev_md (backup-on-overwrite).
    const prev = getLatestResult(userId);
    saveResult(userId, soulMd, prev?.soul_md ?? null, 'ollama');
    return soulMd;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
