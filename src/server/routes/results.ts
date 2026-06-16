import type { FastifyInstance } from 'fastify';
import type { Config } from '../../config.js';
import { getLatestResult } from '../../db/repos.js';
import { requireAuth } from '../auth.js';
import {
  ExtractionBusyError,
  NamesMismatchError,
  NothingToExtractError,
  hasExtractableInput,
  isExtracting,
  runUserExtraction,
} from '../pipeline.js';

interface ResultsRouteOpts {
  cfg: Config;
}

export async function resultRoutes(app: FastifyInstance, opts: ResultsRouteOpts): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/api/results', async (request) => {
    const latest = getLatestResult(request.userId!);
    return {
      canExtract: hasExtractableInput(request.userId!),
      running: isExtracting(request.userId!),
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

  // Synchronous in v1 — an Ollama run can take minutes (requestTimeout is
  // raised in app.ts). A job queue + polling is the obvious v2.
  app.post('/api/extract', async (request, reply) => {
    try {
      const soulMd = await runUserExtraction(opts.cfg, request.userId!);
      const latest = getLatestResult(request.userId!);
      return reply.send({
        ok: true,
        result: {
          soulMd,
          prevMd: latest?.prev_md ?? null,
          extractor: 'ollama',
          createdAt: latest?.created_at ?? null,
        },
      });
    } catch (err) {
      if (err instanceof ExtractionBusyError) {
        return reply.code(409).send({ error: err.message });
      }
      if (err instanceof NothingToExtractError || err instanceof NamesMismatchError) {
        return reply.code(400).send({ error: err.message });
      }
      request.log.error(err);
      const message = err instanceof Error ? err.message : 'Extraction failed.';
      return reply.code(500).send({ error: message });
    }
  });
}
