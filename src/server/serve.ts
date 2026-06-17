import type { Config } from '../config.js';
import { color } from '../color.js';
import { buildServer } from './app.js';

export interface ServeOptions {
  port: number;
  host: string;
}

export async function runServe(cfg: Config, opts: ServeOptions): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';
  const app = await buildServer(cfg, { isProd });

  await app.listen({ port: opts.port, host: opts.host });
  // Show the host we were asked to bind to (localhost), not the resolved IP.
  const url = `http://${opts.host}:${opts.port}`;

  // In dev the API runs alongside Vite, whose http://localhost:5173 URL is the
  // one to open — so we keep the API's status/DB lines but drop its URL to
  // avoid two competing "open this" URLs in the console.
  const urlLine = isProd ? '\n  ' + color.cyan.bold(url) : '';

  process.stdout.write(
    '\n' +
      color.bold('Soul — psychological study platform') +
      '\n' +
      color.dim('API + ' + (isProd ? 'SPA' : 'dev (run `npm run dev:web` for the UI)')) +
      urlLine +
      '\n' +
      color.dim(`DB: ${cfg.dbPath}\n`) +
      color.dim('Press Ctrl+C to stop.\n\n'),
  );

  await new Promise<void>((resolve) => {
    const shutdown = () => {
      process.stdout.write(color.dim('\nShutting down...\n'));
      app.close().finally(resolve);
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  });
}
