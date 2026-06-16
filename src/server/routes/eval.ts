import type { FastifyInstance } from 'fastify';
import type { Config } from '../../config.js';
import { requireAuth } from '../auth.js';
import { EvalBusyError, NothingToEvalError, isEvaluating, runUserEval } from '../eval-run.js';
import { OllamaRequestError, OllamaUnavailableError } from '../../ollama.js';

interface EvalRouteOpts {
  cfg: Config;
}

export async function evalRoutes(app: FastifyInstance, opts: EvalRouteOpts): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/api/eval', async (request) => {
    return { running: isEvaluating(request.userId!) };
  });

  // Synchronous in v1 — like /api/extract, an Ollama run is minutes
  // (requestTimeout is raised in app.ts). A job queue is the obvious v2.
  app.post('/api/eval', async (request, reply) => {
    const body = (request.body ?? {}) as { n?: number; k?: number };
    try {
      const result = await runUserEval(opts.cfg, request.userId!, { n: body.n, k: body.k });
      return reply.send({ ok: true, result });
    } catch (err) {
      if (err instanceof EvalBusyError) {
        return reply.code(409).send({ error: err.message });
      }
      if (err instanceof NothingToEvalError) {
        return reply.code(400).send({ error: err.message });
      }
      request.log.error(err);
      // Sanitize: never leak raw Ollama bodies / fetch errors / fs paths.
      if (err instanceof OllamaUnavailableError) {
        return reply
          .code(503)
          .send({ error: 'The Ollama server is not reachable — start it and try again.' });
      }
      if (err instanceof OllamaRequestError) {
        return reply
          .code(502)
          .send({ error: 'The model rejected the request. Please try again.' });
      }
      return reply.code(500).send({ error: 'Eval failed — please try again.' });
    }
  });
}
