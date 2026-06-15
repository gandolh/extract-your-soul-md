// Password hashing (scrypt, no native dep) and cookie-backed session auth.
// Sessions are opaque random tokens stored in SQLite; the token travels in a
// signed `sid` cookie. requireAuth is a Fastify preHandler that resolves the
// session and stamps request.userId.

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { createSession, findValidSession } from '../db/repos.js';

const SCRYPT_KEYLEN = 64;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_COOKIE = 'sid';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: number;
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, expectedHex] = parts;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const cookieOpts = (isProd: boolean) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: isProd,
  signed: true,
  maxAge: SESSION_TTL_MS / 1000,
});

/** Create a session row and attach the signed cookie to the reply. */
export function startSession(
  reply: FastifyReply,
  userId: number,
  isProd: boolean,
): void {
  const { id } = createSession(userId, SESSION_TTL_MS);
  reply.setCookie(SESSION_COOKIE, id, cookieOpts(isProd));
}

export function clearSessionCookie(reply: FastifyReply, isProd: boolean): void {
  reply.clearCookie(SESSION_COOKIE, { path: '/', secure: isProd });
}

/** Resolve the user id from the signed cookie, or undefined if none/invalid. */
export function resolveUserId(request: FastifyRequest): number | undefined {
  const raw = request.cookies[SESSION_COOKIE];
  if (!raw) return undefined;
  const unsigned = request.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) return undefined;
  return findValidSession(unsigned.value)?.userId;
}

/** preHandler: 401 unless a valid session is present. Stamps request.userId. */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = resolveUserId(request);
  if (userId === undefined) {
    reply.code(401).send({ error: 'Not authenticated.' });
    return;
  }
  request.userId = userId;
}
