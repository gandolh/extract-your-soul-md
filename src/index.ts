// Single entry point: the web platform (Fastify API + SPA). The project is
// API + frontend only — there is no CLI data-prep pipeline. All extraction runs
// per-user through /api/extract → runUserExtraction (Ollama). Questionnaire
// capture is the studies forms in the SPA.

import { loadConfig } from './config.js';
import { color } from './color.js';
import { runServe } from './server/serve.js';

function parsePort(argv: string[], fallback: number): number {
  const flag = argv.find((a) => a.startsWith('--port='));
  if (!flag) return fallback;
  const n = Number(flag.slice('--port='.length));
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  const port = parsePort(process.argv.slice(2), cfg.serverPort);
  await runServe(cfg, { port, host: 'localhost' });
}

main().catch((err) => {
  console.error(color.red.bold('error: ') + (err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
