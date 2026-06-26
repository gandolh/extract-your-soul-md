// Per-user extraction: materialize a throwaway work dir from the user's DB
// rows, run the file-based pipeline (process → chunk → ollama) against it, then
// read the result back into SQLite. This is the only extraction path — the
// project is API + frontend only and extraction is always Ollama.

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import type { Config } from '../config.js';
import { appendConfirmedStatements, writeAnswersFile } from '../answers-file.js';
import { processAll } from '../stages/process.js';
import { chunkAll } from '../stages/chunk.js';
import { runOllamaPipeline } from '../stages/extract.js';
import { pingOllama, OllamaUnavailableError } from '../ollama.js';
import {
  getAnswersForUser,
  getConfirmedStatements,
  getLatestResult,
  getRejectedStatements,
  getReports,
  saveResult,
  startJob,
  updateJobProgress,
} from '../db/repos.js';
import { renderReportForPrompt, type ReportPayload } from '../scoring.js';
import { readFileSync } from 'node:fs';

/** Render the user's opted-in (include_in_soul) reports into the profile block
 *  the reduce prompt weights down. Returns '' if none are included or scored.
 *  Exported so the swipe-card generator can feed the same trait context to the
 *  statement-generation prompt. */
export function buildProfileText(userId: number): string {
  const included = getReports(userId).filter((r) => r.include_in_soul === 1);
  const blocks = included
    .map((r) => {
      try {
        return renderReportForPrompt(JSON.parse(r.payload) as ReportPayload);
      } catch {
        return '';
      }
    })
    .filter((b) => b.length > 0);
  return blocks.join('\n\n');
}

export class NothingToExtractError extends Error {}

/** True if the user has any material (a non-empty study answer) to extract.
 *  Swipe-card verdicts are derived from answers, so an answer is the floor. */
export function hasExtractableInput(userId: number): boolean {
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
    throw new NothingToExtractError('Answer at least one study first.');
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
    inputsProcessedDir: path.join(work, 'processed'),
    chunksDir: path.join(work, 'chunks'),
    outDir: path.join(work, 'out'),
    questionnaireDir: path.join(work, 'questionnaire'),
    questionnaireFile: 'answers.md',
  };

  try {
    // 1. Study answers → work/questionnaire/answers.md (the shared writer), then
    //    append the swipe-card statements the user confirmed sound like them as
    //    a reserved `## Q900` section so they ride the same questionnaire chunk.
    mkdirSync(cfg.questionnaireDir, { recursive: true });
    const answersPath = path.join(cfg.questionnaireDir, cfg.questionnaireFile);
    writeAnswersFile(answersPath, getAnswersForUser(userId), 'web extraction');
    appendConfirmedStatements(answersPath, getConfirmedStatements(userId));

    // 2. Existing pipeline (questionnaire-only): process → chunk → ollama.
    processAll(cfg);
    const manifest = chunkAll(cfg);
    const profileText = buildProfileText(userId);
    const rejectedStatements = getRejectedStatements(userId);
    const { outPath, overlap } = await runOllamaPipeline(
      cfg,
      manifest,
      (stage, done, total) => updateJobProgress(jobId, stage, done, total),
      profileText,
      rejectedStatements,
    );
    const soulMd = readFileSync(outPath, 'utf8');

    // A compact verbatim-overlap summary (sample shingles + count) so the UI can
    // warn the user to review before downstream use. null when nothing leaked.
    const regurgitation =
      overlap.hits.length > 0
        ? JSON.stringify({
            ngram: overlap.ngram,
            count: overlap.hits.length,
            samples: overlap.hits.slice(0, 8).map((h) => h.shingle),
          })
        : null;

    // 3. Persist; carry the prior soul.md into prev_md (backup-on-overwrite).
    const prev = getLatestResult(userId);
    saveResult(userId, soulMd, prev?.soul_md ?? null, 'ollama', regurgitation);
    return soulMd;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
