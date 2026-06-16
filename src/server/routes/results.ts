import type { FastifyInstance } from 'fastify';
import type { Config } from '../../config.js';
import { createJob, finishJob, getActiveJob, getJob, getLatestResult } from '../../db/repos.js';
import { requireAuth } from '../auth.js';
import {
  NamesMismatchError,
  NoRecognizedMessagesError,
  NothingToExtractError,
  hasExtractableInput,
  runUserExtraction,
} from '../pipeline.js';
import { OllamaRequestError, OllamaUnavailableError, pingOllama, type PingResult } from '../../ollama.js';

/** Map an extraction failure to a safe, user-facing message. The raw error
 *  (Ollama HTTP bodies, `fetch failed`, work-dir filesystem paths) stays in the
 *  server log via request.log.error — only these curated strings reach the user. */
function failureMessage(err: unknown): string {
  // Already-friendly, actionable domain errors — pass through.
  if (
    err instanceof NothingToExtractError ||
    err instanceof NamesMismatchError ||
    err instanceof NoRecognizedMessagesError
  ) {
    return err.message;
  }
  if (err instanceof OllamaUnavailableError) {
    // The preflight (pingOllama) attaches a curated string reason as `cause`
    // (e.g. "model X is not pulled") — safe to surface. A real fetch rejection
    // attaches a raw Error cause, which we must NOT leak; fall back to generic.
    const cause = (err as { cause?: unknown }).cause;
    if (typeof cause === 'string' && cause.length > 0) return cause;
    return 'The Ollama server is not reachable — start it and try again.';
  }
  if (err instanceof OllamaRequestError) {
    return 'The extraction model rejected the request. Please try again.';
  }
  return 'Extraction failed — please try again.';
}

interface ResultsRouteOpts {
  cfg: Config;
}

// Readiness ping is process-global (host/model are server-wide, not per-user) and
// TTL-cached so a hung Ollama can't slow every page load and concurrent loads
// share one in-flight ping. 30s is short enough to reflect "I just started it".
const READY_TTL_MS = 30_000;
let readyCache: { at: number; result: PingResult } | null = null;
let readyInflight: Promise<PingResult> | null = null;

async function getOllamaReady(cfg: Config): Promise<PingResult> {
  const now = Date.now();
  if (readyCache && now - readyCache.at < READY_TTL_MS) return readyCache.result;
  if (readyInflight) return readyInflight;
  readyInflight = pingOllama({ host: cfg.ollamaHost, model: cfg.ollamaModel, apiKey: cfg.ollamaApiKey })
    .then((result) => {
      readyCache = { at: Date.now(), result };
      return result;
    })
    .finally(() => {
      readyInflight = null;
    });
  return readyInflight;
}

export async function resultRoutes(app: FastifyInstance, opts: ResultsRouteOpts): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/api/results', async (request) => {
    const userId = request.userId!;
    const latest = getLatestResult(userId);
    const active = getActiveJob(userId);
    const ready = await getOllamaReady(opts.cfg);
    return {
      canExtract: hasExtractableInput(userId),
      ollamaReady: ready.ok,
      ollamaReason: ready.ok ? null : (ready.reason ?? null),
      running: active !== undefined,
      job: active
        ? {
            id: active.id,
            status: active.status,
            stage: active.stage,
            chunkDone: active.chunk_done,
            chunkTotal: active.chunk_total,
          }
        : null,
      result: latest
        ? {
            soulMd: latest.soul_md,
            prevMd: latest.prev_md,
            extractor: latest.extractor,
            createdAt: latest.created_at,
          }
        : null,
    };
  });

  // Async: an Ollama run takes minutes, so we don't hold the request open.
  // Create the job row (the partial-unique-index acts as the per-user lock,
  // surviving restarts), return 202 + jobId, and run the pipeline in the
  // background via setImmediate. The client polls GET /api/results.
  app.post('/api/extract', async (request, reply) => {
    const userId = request.userId!;

    if (!hasExtractableInput(userId)) {
      return reply
        .code(400)
        .send({ error: 'Fill in at least one study answer or import a conversation first.' });
    }
    if (getActiveJob(userId)) {
      return reply.code(409).send({ error: 'Extraction already running.' });
    }

    let jobId: number;
    try {
      jobId = createJob(userId).id;
    } catch {
      // The unique index rejected a concurrent insert — someone won the race.
      return reply.code(409).send({ error: 'Extraction already running.' });
    }

    setImmediate(() => {
      runUserExtraction(opts.cfg, userId, jobId)
        .then(() => {
          finishJob(jobId, 'done');
        })
        .catch((err: unknown) => {
          request.log.error(err);
          finishJob(jobId, 'failed', failureMessage(err));
        });
    });

    return reply.code(202).send({ ok: true, jobId });
  });

  // Job detail for polling — terminal jobs carry the error reason.
  app.get('/api/extract/:jobId', async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    const job = getJob(Number(jobId));
    if (!job || job.user_id !== request.userId!) {
      return reply.code(404).send({ error: 'Job not found.' });
    }
    return {
      id: job.id,
      status: job.status,
      stage: job.stage,
      chunkDone: job.chunk_done,
      chunkTotal: job.chunk_total,
      error: job.error,
    };
  });
}
