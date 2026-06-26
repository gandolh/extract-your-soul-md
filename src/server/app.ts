// Builds the Fastify instance: cookie plugin, the four route groups, and (in
// production) static serving of the built SPA with a history-API fallback.

import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { type Config, DEV_SESSION_SECRET } from '../config.js';
import { initDb } from '../db/db.js';
import { reclaimStaleJobs } from '../db/repos.js';
import { sweepExpiredSessions } from '../db/maintenance.js';
import { authRoutes } from './routes/auth.js';
import { studyRoutes } from './routes/studies.js';
import { swipeRoutes } from './routes/swipe.js';
import { statsRoutes } from './routes/stats.js';
import { resultRoutes } from './routes/results.js';

export interface BuildOptions {
  isProd: boolean;
}

// The built SPA lands in dist/public (vite build --outDir ../dist/public).
// Resolved relative to this module so it works under both tsx and compiled.
function spaDir(): string | null {
  // Compiled, this module is dist/server/app.js, so the SPA build is ../public.
  // Under tsx (src/server/app.ts) there is no sibling build; fall back to the
  // dist/public produced by `vite build` at the repo root.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, '..', 'public'), // dist/server → dist/public
    path.resolve(here, '..', '..', 'dist', 'public'), // src/server → dist/public
  ];
  for (const c of candidates) {
    if (existsSync(path.join(c, 'index.html'))) return c;
  }
  return null;
}

export async function buildServer(cfg: Config, opts: BuildOptions): Promise<FastifyInstance> {
  // Secrets guard: never sign cookies with the publicly-known dev key in prod.
  // Runs before anything else so a misconfigured deploy fails fast and loud.
  if (cfg.sessionSecret === DEV_SESSION_SECRET) {
    if (opts.isProd) {
      throw new Error(
        'SESSION_SECRET is the insecure dev default in production. ' +
          'Set a real one (e.g. `openssl rand -hex 32`) before deploying.',
      );
    }
    // eslint-disable-next-line no-console
    console.warn(
      '⚠ SESSION_SECRET is the insecure dev default — fine for local dev, ' +
        'but set a real one (`openssl rand -hex 32`) before any deployment.',
    );
  }

  initDb(cfg.dbPath);

  // A job left enqueued/running means the process died mid-extraction. Mark
  // those failed and remove their orphaned throwaway work dirs.
  for (const job of reclaimStaleJobs()) {
    if (job.work_dir) rmSync(job.work_dir, { recursive: true, force: true });
  }

  // Expired-session housekeeping: sweep on boot, then hourly. unref() so the
  // timer never keeps the process alive on its own.
  sweepExpiredSessions();
  setInterval(() => sweepExpiredSessions(), 60 * 60 * 1000).unref();

  const app = Fastify({
    logger: opts.isProd ? true : { transport: undefined, level: 'warn' },
    // Ollama extraction is slow; don't let the platform default (~5 min) cut it off.
    requestTimeout: 15 * 60 * 1000,
    bodyLimit: 8 * 1024 * 1024, // accommodate large study-answer save batches
  });

  // Tolerate a JSON content-type with an empty body: bodyless POSTs like
  // /api/extract and /api/swipe/generate are valid, but a client (or proxy) that
  // still sends `Content-Type: application/json` would otherwise get
  // FST_ERR_CTP_EMPTY_JSON_BODY. Treat empty/whitespace bodies as {} so routes
  // see a well-formed object.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req, body, done) => {
      const text = (body as string).trim();
      if (text.length === 0) return done(null, {});
      try {
        done(null, JSON.parse(text));
      } catch (err) {
        (err as { statusCode?: number }).statusCode = 400;
        done(err as Error, undefined);
      }
    },
  );

  await app.register(fastifyCookie, { secret: cfg.sessionSecret });

  await app.register(authRoutes, { isProd: opts.isProd });
  await app.register(studyRoutes);
  await app.register(swipeRoutes, { cfg });
  await app.register(statsRoutes);
  await app.register(resultRoutes, { cfg });

  app.get('/api/health', async () => ({ ok: true }));

  // Production: serve the built SPA and fall back to index.html for client
  // routes. In dev the SPA is served by Vite (which proxies /api here).
  const dir = spaDir();
  if (dir) {
    await app.register(fastifyStatic, { root: dir, prefix: '/' });
    app.setNotFoundHandler((request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api')) {
        return reply.sendFile('index.html');
      }
      return reply.code(404).send({ error: 'Not found.' });
    });
  }

  return app;
}
