import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Config } from '../../config.js';
import { requireAuth } from '../auth.js';
import {
  hasAnswers,
  listSwipeCards,
  setSwipeVerdict,
  type SwipeCardRow,
} from '../../db/repos.js';
import { getOllamaReady } from '../ollama-ready.js';
import { generateSwipeCards } from '../swipe.js';
import { OllamaRequestError, OllamaUnavailableError } from '../../ollama.js';

interface SwipeRouteOpts {
  cfg: Config;
}

const VerdictBody = z.object({
  // null clears the verdict (back to unseen); 'yes' | 'no' record a swipe.
  verdict: z.enum(['yes', 'no']).nullable(),
});

function serialize(card: SwipeCardRow) {
  return { id: card.id, statement: card.statement, verdict: card.verdict };
}

export async function swipeRoutes(app: FastifyInstance, opts: SwipeRouteOpts): Promise<void> {
  app.addHook('preHandler', requireAuth);

  // The deck + the gates the UI needs: whether there's material to generate from
  // (any study answer) and whether Ollama is reachable to do the generating.
  app.get('/api/swipe', async (request) => {
    const userId = request.userId!;
    const ready = await getOllamaReady(opts.cfg);
    return {
      cards: listSwipeCards(userId).map(serialize),
      canGenerate: hasAnswers(userId),
      ollamaReady: ready.ok,
      ollamaReason: ready.ok ? null : (ready.reason ?? null),
    };
  });

  // Generate a fresh batch of cards from the user's own material. Synchronous —
  // a single Ollama call that can take a while, so the client opts out of its
  // request timeout (like extraction's preflight, this is gated on readiness).
  app.post('/api/swipe/generate', async (request, reply) => {
    const userId = request.userId!;
    if (!hasAnswers(userId)) {
      return reply.code(400).send({ error: 'Answer at least one study first — cards are built from your answers.' });
    }
    try {
      const cards = await generateSwipeCards(opts.cfg, userId);
      return reply.send({ cards: cards.map(serialize) });
    } catch (err) {
      request.log.error(err);
      if (err instanceof OllamaUnavailableError) {
        const cause = (err as { cause?: unknown }).cause;
        const reason =
          typeof cause === 'string' && cause.length > 0
            ? cause
            : 'The Ollama server is not reachable — start it and try again.';
        return reply.code(503).send({ error: reason });
      }
      if (err instanceof OllamaRequestError) {
        return reply.code(502).send({ error: 'The model rejected the request. Please try again.' });
      }
      return reply.code(500).send({ error: 'Could not generate cards — please try again.' });
    }
  });

  // Record (or clear) a swipe.
  app.post<{ Params: { id: string } }>('/api/swipe/:id/verdict', async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Bad card id.' });
    const parsed = VerdictBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Expected { verdict: 'yes' | 'no' | null }." });
    }
    const ok = setSwipeVerdict(request.userId!, id, parsed.data.verdict);
    if (!ok) return reply.code(404).send({ error: 'Card not found.' });
    return reply.send({ ok: true });
  });
}
