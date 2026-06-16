import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  addConversation,
  deleteConversation,
  getConversationContents,
  getNames,
  listConversations,
  setNames,
} from '../../db/repos.js';
import { requireAuth } from '../auth.js';
import { detectSenders, looksLikeWhatsAppExport, type DetectedSender } from '../../stages/process.js';

const MAX_CONTENT_BYTES = 5 * 1024 * 1024; // 5 MB of text

const UploadBody = z.object({
  filename: z.string().trim().min(1).max(200),
  content: z.string().min(1),
});

const NamesBody = z.object({
  names: z.array(z.string()),
});

export async function conversationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/api/conversations', async (request) => {
    return {
      conversations: listConversations(request.userId!).map((c) => ({
        id: c.id,
        filename: c.filename,
        createdAt: c.created_at,
      })),
    };
  });

  app.post('/api/conversations', async (request, reply) => {
    const parsed = UploadBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Expected { filename, content }.' });
    }
    const { filename, content } = parsed.data;
    if (!/\.(txt|md)$/i.test(filename)) {
      return reply.code(400).send({ error: 'Only .txt or .md exports are supported.' });
    }
    if (Buffer.byteLength(content, 'utf8') > MAX_CONTENT_BYTES) {
      return reply.code(413).send({ error: 'File too large (5 MB max).' });
    }
    if (!looksLikeWhatsAppExport(content)) {
      return reply.code(422).send({
        error:
          "This doesn't look like a WhatsApp export. Export a chat via WhatsApp → ⋮ → More → Export chat, and upload the .txt.",
      });
    }
    const { id } = addConversation(request.userId!, filename, content);
    return reply.code(201).send({ conversation: { id, filename } });
  });

  app.delete<{ Params: { id: string } }>('/api/conversations/:id', async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Bad id.' });
    deleteConversation(request.userId!, id);
    return reply.code(204).send();
  });

  // Detected senders across all of this user's conversations, grouped by the
  // normalized key the voice filter matches on. Names-independent so the UI can
  // surface "add this name" chips before any name is set. Cheap (no Ollama).
  app.get('/api/conversations/senders', async (request) => {
    // Merge per-file detections by normalized key; track each raw spelling's
    // weight so the label is the most frequent spelling across all files.
    const merged = new Map<string, { count: number; rawCounts: Map<string, number> }>();
    for (const conv of getConversationContents(request.userId!)) {
      for (const s of detectSenders(conv.content)) {
        const g = merged.get(s.normalized) ?? { count: 0, rawCounts: new Map() };
        g.count += s.count;
        g.rawCounts.set(s.name, (g.rawCounts.get(s.name) ?? 0) + s.count);
        merged.set(s.normalized, g);
      }
    }
    const senders: DetectedSender[] = [...merged.entries()].map(([normalized, g]) => {
      let name = normalized;
      let best = -1;
      for (const [raw, n] of g.rawCounts) {
        if (n > best) {
          best = n;
          name = raw;
        }
      }
      return { name, normalized, count: g.count };
    });
    senders.sort((a, b) => b.count - a.count);
    return { senders };
  });

  app.get('/api/names', async (request) => {
    return { names: getNames(request.userId!) };
  });

  app.put('/api/names', async (request, reply) => {
    const parsed = NamesBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Expected { names: string[] }.' });
    }
    setNames(request.userId!, parsed.data.names);
    return reply.send({ names: getNames(request.userId!) });
  });
}
