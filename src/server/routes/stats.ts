// Conversation-statistics routes. The conversation text is transient: it is
// posted to /compute, parsed + reduced to aggregate numbers, and the text is
// discarded — it never reaches the database. Only the derived stats can be
// persisted (POST /save), and saved results are listed/read on their own page.
// No LLM is involved at any point; this is pure algorithmic analysis.

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import {
  countSavedStats,
  deleteSavedStat,
  getSavedStat,
  insertSavedStat,
  listSavedStats,
} from '../../db/repos.js';
import { analyzeConversation, type ConversationStats } from '../../stats/conversation-stats.js';

const ComputeBody = z.object({
  conversation: z.string().min(1, 'Paste a conversation to analyze.'),
});

// Mirrors ConversationStats so a save persists only well-formed JSON. We accept
// the client's computed payload (the conversation is gone by then) rather than
// re-uploading the transcript.
const StatsSchema = z.object({
  totalMessages: z.number(),
  datedMessages: z.number(),
  participantCount: z.number(),
  dateRange: z.object({ start: z.string(), end: z.string() }).nullable(),
  participants: z.array(
    z.object({
      name: z.string(),
      messageCount: z.number(),
      wordCount: z.number(),
      charCount: z.number(),
      avgResponseMinutes: z.number().nullable(),
      topWords: z.array(z.object({ word: z.string(), count: z.number() })),
    }),
  ),
  messagesPerMonth: z.object({
    months: z.array(z.string()),
    series: z.array(z.object({ name: z.string(), counts: z.array(z.number()) })),
  }),
  redFlags: z.array(z.string()),
});

const SaveBody = z.object({
  name: z.string().trim().max(120).optional(),
  stats: StatsSchema,
});

// '<index>-<YYYY-MM-DD>', e.g. '1-2026-06-26'. Index is 1-based over the user's
// existing saved results so the default is stable and human-readable.
function defaultName(userId: number): string {
  const index = countSavedStats(userId) + 1;
  const date = new Date().toISOString().slice(0, 10);
  return `${index}-${date}`;
}

export async function statsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  // Analyze a conversation on the spot. The transcript is NOT stored — it is
  // reduced to aggregate numbers and returned. Nothing is persisted here.
  app.post('/api/stats/compute', async (request, reply) => {
    const parsed = ComputeBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Bad request.' });
    }
    const stats: ConversationStats = analyzeConversation(parsed.data.conversation);
    if (stats.totalMessages === 0) {
      return reply.code(422).send({
        error:
          'No messages were recognized — paste a chat export with lines like "1/1/24, 10:00 - Name: message".',
      });
    }
    return reply.send({ stats });
  });

  // Persist a previously-computed stats payload under a (defaulted) name.
  app.post('/api/stats/save', async (request, reply) => {
    const userId = request.userId!;
    const parsed = SaveBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Expected { name?, stats }.' });
    }
    const name = parsed.data.name && parsed.data.name.length > 0 ? parsed.data.name : defaultName(userId);
    const id = insertSavedStat(userId, name, JSON.stringify(parsed.data.stats));
    if (id === null) {
      return reply.code(409).send({ error: `You already have a saved result named "${name}".` });
    }
    return reply.code(201).send({ id, name });
  });

  // List saved results (newest first) — metadata only.
  app.get('/api/stats', async (request) => {
    return { saved: listSavedStats(request.userId!) };
  });

  // Read one saved result, payload included.
  app.get<{ Params: { id: string } }>('/api/stats/:id', async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Bad id.' });
    const found = getSavedStat(request.userId!, id);
    if (!found) return reply.code(404).send({ error: 'Saved result not found.' });
    return reply.send({
      id: found.id,
      name: found.name,
      createdAt: found.created_at,
      stats: JSON.parse(found.payload) as ConversationStats,
    });
  });

  app.delete<{ Params: { id: string } }>('/api/stats/:id', async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Bad id.' });
    if (!deleteSavedStat(request.userId!, id)) {
      return reply.code(404).send({ error: 'Saved result not found.' });
    }
    return reply.send({ ok: true });
  });
}
