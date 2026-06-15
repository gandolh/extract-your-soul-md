import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  addConversation,
  deleteConversation,
  getNames,
  listConversations,
  setNames,
} from '../../db/repos.js';
import { requireAuth } from '../auth.js';

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
    const { id } = addConversation(request.userId!, filename, content);
    return reply.code(201).send({ conversation: { id, filename } });
  });

  app.delete<{ Params: { id: string } }>('/api/conversations/:id', async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Bad id.' });
    deleteConversation(request.userId!, id);
    return reply.code(204).send();
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
