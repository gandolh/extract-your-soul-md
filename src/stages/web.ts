// Web form for the soul questionnaire — a Google-Forms-style single page
// served by a tiny local Fastify server. Equivalent to the `--interview`
// REPL but in the browser: it reads and writes the same
// `inputs/questionnaire/answers.md` via the shared answers-file module.
//
// The form is data-driven from src/questions.ts (single source of truth) —
// the static page fetches GET /api/questions and renders fields from it, so
// adding/changing a question never requires touching the HTML.

import { existsSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { color } from '../color.js';
import { QUESTIONS } from '../questions.js';
import {
  parseAnswersFile,
  writeAnswersFile,
  type RecordedAnswer,
} from '../answers-file.js';
import type { Config } from '../config.js';

const SAVED_BY = '`npm run start -- --web`';

export interface WebOptions {
  englishPrimary: boolean;
  port: number;
  host: string;
  open: boolean;
}

// The directory holding index.html / styles.css / app.js, resolved relative
// to this module so it works under both tsx (src/) and compiled (dist/).
function publicDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.join(here, '..', 'web', 'public');
}

interface AnswerPayload {
  answers?: Array<{ id?: unknown; body?: unknown }>;
}

export async function runWeb(cfg: Config, opts: WebOptions): Promise<void> {
  const filePath = path.join(path.resolve(cfg.questionnaireDir), cfg.questionnaireFile);
  const validIds = new Set(QUESTIONS.map((q) => q.id));

  const app = Fastify({ logger: false });

  await app.register(fastifyStatic, {
    root: publicDir(),
    prefix: '/',
  });

  // Question set + any previously-saved answers, so the form can pre-fill on
  // reload (the web analogue of the REPL's resume).
  app.get('/api/questions', async () => {
    const existing = parseAnswersFile(filePath);
    return {
      englishPrimary: opts.englishPrimary,
      questions: QUESTIONS.map((q) => ({
        id: q.id,
        slug: q.slug,
        title: q.title,
        promptEn: q.promptEn,
        promptRo: q.promptRo,
        hintEn: q.hintEn ?? null,
        hintRo: q.hintRo ?? null,
        optional: Boolean(q.optional),
        savedBody: existing.get(q.id)?.body ?? '',
      })),
    };
  });

  app.post('/api/answers', async (request, reply) => {
    const payload = (request.body ?? {}) as AnswerPayload;
    if (!Array.isArray(payload.answers)) {
      reply.code(400);
      return { ok: false, error: 'Expected { answers: [{ id, body }] }.' };
    }

    const seen = new Set<string>();
    const answers: RecordedAnswer[] = [];
    for (const raw of payload.answers) {
      const id = typeof raw?.id === 'string' ? raw.id : '';
      if (!validIds.has(id) || seen.has(id)) continue; // ignore unknown/dupes
      seen.add(id);
      const q = QUESTIONS.find((x) => x.id === id)!;
      const body = typeof raw?.body === 'string' ? raw.body.trim() : '';
      answers.push({ id: q.id, title: q.title, body });
    }

    // Back up an existing file before overwriting — same safety net the rest
    // of the pipeline uses for out/my-soul.md.
    if (existsSync(filePath)) {
      const backup = filePath.replace(/\.md$/, '.prev.md');
      copyFileSync(filePath, backup);
    }
    writeAnswersFile(filePath, answers, SAVED_BY);

    const answered = answers.filter((a) => a.body.length > 0).length;
    return { ok: true, answered, total: QUESTIONS.length, filePath };
  });

  const address = await app.listen({ port: opts.port, host: opts.host });
  const url = address.replace('0.0.0.0', 'localhost').replace('[::]', 'localhost');

  process.stdout.write(
    '\n' +
      color.bold('Soul Questionnaire — web form') +
      '\n' +
      color.dim(`${QUESTIONS.length} questions. Open the page, fill it in, click Save.\n`) +
      '  ' +
      color.cyan.bold(url) +
      '\n' +
      color.dim(`Answers save to ${filePath}\n`) +
      color.dim('Press Ctrl+C to stop the server.\n\n'),
  );

  if (opts.open) void openInBrowser(url);

  // Keep the process alive until interrupted; close the server cleanly.
  await new Promise<void>((resolve) => {
    const shutdown = () => {
      process.stdout.write(color.dim('\nShutting down web form...\n'));
      app.close().finally(resolve);
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  });
}

// Best-effort "open the browser" — failures are silent (headless / SSH / WSL).
async function openInBrowser(url: string): Promise<void> {
  const { spawn } = await import('node:child_process');
  const cmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'cmd'
        : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
  } catch {
    /* ignore — the URL is already printed for manual open */
  }
}
