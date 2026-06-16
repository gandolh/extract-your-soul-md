import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createUser,
  findUserById,
  findUserByUsername,
  deleteSession,
} from '../../db/repos.js';
import {
  clearSessionCookie,
  hashPassword,
  requireAuth,
  resolveUserId,
  startSession,
  verifyPassword,
  SESSION_COOKIE,
} from '../auth.js';

const Credentials = z.object({
  username: z.string().trim().min(3).max(40),
  password: z.string().min(6).max(200),
});

interface AuthRouteOpts {
  isProd: boolean;
}

export async function authRoutes(app: FastifyInstance, opts: AuthRouteOpts): Promise<void> {
  app.post('/api/auth/register', async (request, reply) => {
    const parsed = Credentials.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Username (3+) and password (6+) required.' });
    }
    const { username, password } = parsed.data;
    if (findUserByUsername(username)) {
      // Generic body (keep 409) so register doesn't leak account existence —
      // matches login's generic "Wrong username or password." message.
      return reply.code(409).send({ error: 'Could not create account.' });
    }
    const { id } = createUser(username, hashPassword(password));
    startSession(reply, id, opts.isProd);
    return reply.code(201).send({ user: { id, username } });
  });

  app.post('/api/auth/login', async (request, reply) => {
    const parsed = Credentials.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Username and password required.' });
    }
    const { username, password } = parsed.data;
    const user = findUserByUsername(username);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return reply.code(401).send({ error: 'Wrong username or password.' });
    }
    startSession(reply, user.id, opts.isProd);
    return reply.send({ user: { id: user.id, username: user.username } });
  });

  app.post('/api/auth/logout', { preHandler: requireAuth }, async (request, reply) => {
    const raw = request.cookies[SESSION_COOKIE];
    if (raw) {
      const unsigned = request.unsignCookie(raw);
      if (unsigned.valid && unsigned.value) deleteSession(unsigned.value);
    }
    clearSessionCookie(reply, opts.isProd);
    return reply.code(204).send();
  });

  app.get('/api/auth/me', async (request, reply) => {
    const userId = resolveUserId(request);
    if (userId === undefined) return reply.code(401).send({ error: 'Not authenticated.' });
    const user = findUserById(userId);
    if (!user) return reply.code(401).send({ error: 'Not authenticated.' });
    return reply.send({ user: { id: user.id, username: user.username } });
  });
}
