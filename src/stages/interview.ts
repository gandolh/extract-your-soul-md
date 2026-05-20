import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import chalk from 'chalk';
import { QUESTIONS, type Question } from '../questions.js';
import type { Config } from '../config.js';

const SKIPPED_MARKER = '[skipped]';

export interface InterviewOptions {
  englishPrimary: boolean;
}

interface RecordedAnswer {
  id: string;
  title: string;
  body: string;
}

function formatHeader(q: Question): string {
  return `## ${q.id} — ${q.title}`;
}

function parseExistingAnswers(filePath: string): Map<string, RecordedAnswer> {
  const out = new Map<string, RecordedAnswer>();
  if (!existsSync(filePath)) return out;
  const raw = readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  let current: { id: string; title: string; lines: string[] } | null = null;
  const headerRe = /^##\s+(Q\d+)\s+—\s+(.+)$/;
  for (const line of lines) {
    const m = line.match(headerRe);
    if (m) {
      if (current) {
        out.set(current.id, {
          id: current.id,
          title: current.title,
          body: current.lines.join('\n').trim(),
        });
      }
      current = { id: m[1], title: m[2].trim(), lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) {
    out.set(current.id, {
      id: current.id,
      title: current.title,
      body: current.lines.join('\n').trim(),
    });
  }
  return out;
}

function writeFreshFile(filePath: string): void {
  const header =
    `# Soul Questionnaire — ${new Date().toISOString()}\n\n` +
    `<!-- Saved by \`npm run start -- --interview\`. Skipped answers are marked ${SKIPPED_MARKER}. -->\n\n`;
  writeFileSync(filePath, header, 'utf8');
}

function appendAnswerToFile(filePath: string, q: Question, body: string): void {
  const section = `${formatHeader(q)}\n\n${body.trim() || SKIPPED_MARKER}\n\n`;
  appendFileSync(filePath, section, 'utf8');
}

function rewriteFile(filePath: string, answers: RecordedAnswer[]): void {
  writeFreshFile(filePath);
  for (const a of answers) {
    appendFileSync(
      filePath,
      `## ${a.id} — ${a.title}\n\n${a.body || SKIPPED_MARKER}\n\n`,
      'utf8',
    );
  }
}

function ask(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

interface MultilineResult {
  body: string;
  command: 'submit' | 'skip' | 'back' | 'quit';
}

function readMultiline(rl: readline.Interface): Promise<MultilineResult> {
  return new Promise((resolve) => {
    const buf: string[] = [];
    let lastWasBlank = false;

    const onLine = (line: string) => {
      const trimmed = line.trim();
      if (trimmed === ':skip') {
        cleanup();
        resolve({ body: '', command: 'skip' });
        return;
      }
      if (trimmed === ':back') {
        cleanup();
        resolve({ body: '', command: 'back' });
        return;
      }
      if (trimmed === ':quit') {
        cleanup();
        resolve({ body: buf.join('\n').trim(), command: 'quit' });
        return;
      }
      if (trimmed === ':done') {
        cleanup();
        resolve({ body: buf.join('\n').trim(), command: 'submit' });
        return;
      }
      if (trimmed === ':help') {
        process.stdout.write(
          chalk.dim(
            '  commands: :done submit · :skip · :back · :quit · (or press Enter twice to submit)\n',
          ),
        );
        return;
      }
      if (trimmed === '') {
        if (lastWasBlank && buf.length > 0) {
          cleanup();
          resolve({ body: buf.join('\n').trim(), command: 'submit' });
          return;
        }
        lastWasBlank = true;
        buf.push('');
        return;
      }
      lastWasBlank = false;
      buf.push(line);
    };

    function cleanup(): void {
      rl.removeListener('line', onLine);
    }

    rl.on('line', onLine);
  });
}

function renderPrompt(q: Question, idx: number, total: number, opts: InterviewOptions): string {
  const primary = opts.englishPrimary ? q.promptEn : q.promptRo;
  const secondary = opts.englishPrimary ? q.promptRo : q.promptEn;
  const primaryHint = opts.englishPrimary ? q.hintEn : q.hintRo;
  const optionalTag = q.optional ? chalk.dim(' (optional)') : '';

  const lines = [
    '',
    chalk.cyan.bold(`[${idx + 1}/${total}] ${q.id} — ${q.title}`) + optionalTag,
    chalk.white(primary),
    chalk.dim(secondary),
  ];
  if (primaryHint) lines.push(chalk.dim(`(${primaryHint})`));
  lines.push(
    chalk.dim('Press Enter twice on an empty line to submit · :skip · :back · :quit · :help'),
  );
  return lines.join('\n');
}

export async function runInterview(cfg: Config, opts: InterviewOptions): Promise<string> {
  const dir = path.resolve(cfg.questionnaireDir);
  const filePath = path.join(dir, cfg.questionnaireFile);
  mkdirSync(dir, { recursive: true });

  // Resume detection.
  const existing = parseExistingAnswers(filePath);
  let answers: RecordedAnswer[] = [];
  let startIdx = 0;

  if (existing.size > 0) {
    const answeredIds = QUESTIONS.filter((q) => existing.has(q.id)).map((q) => q.id);
    process.stdout.write(
      chalk.yellow(
        `Found existing answers (${answeredIds.length} answered: ${answeredIds.join(', ')}).\n`,
      ),
    );
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const choice = (await ask(rl, chalk.bold('Resume from where you left off? [Y/n/restart]: ')))
      .trim()
      .toLowerCase();
    rl.close();
    if (choice === 'restart') {
      writeFreshFile(filePath);
    } else if (choice === 'n' || choice === 'no') {
      writeFreshFile(filePath);
    } else {
      for (const q of QUESTIONS) {
        const a = existing.get(q.id);
        if (a) answers.push({ id: q.id, title: q.title, body: a.body });
      }
      startIdx = QUESTIONS.findIndex((q) => !existing.has(q.id));
      if (startIdx === -1) {
        process.stdout.write(chalk.green('All questions already answered. Nothing to do.\n'));
        return filePath;
      }
      rewriteFile(filePath, answers);
    }
  } else {
    writeFreshFile(filePath);
  }

  process.stdout.write(
    '\n' +
      chalk.bold('Soul Questionnaire') +
      '\n' +
      chalk.dim(
        `${QUESTIONS.length} questions (~20 minutes). Answers save as you go to ${filePath}.\n`,
      ) +
      chalk.dim('You can stop any time with :quit and resume later.\n'),
  );

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    let i = Math.max(0, startIdx);
    while (i < QUESTIONS.length) {
      const q = QUESTIONS[i];
      process.stdout.write(renderPrompt(q, i, QUESTIONS.length, opts) + '\n\n');
      const res = await readMultiline(rl);

      if (res.command === 'back') {
        if (i === 0) {
          process.stdout.write(chalk.yellow('Already at the first question.\n'));
          continue;
        }
        // Drop the previously-saved answer for the prior question, then re-ask.
        const prev = QUESTIONS[i - 1];
        answers = answers.filter((a) => a.id !== prev.id);
        rewriteFile(filePath, answers);
        i -= 1;
        continue;
      }

      if (res.command === 'quit') {
        if (res.body.length > 0) {
          answers.push({ id: q.id, title: q.title, body: res.body });
          appendAnswerToFile(filePath, q, res.body);
        }
        process.stdout.write(
          chalk.yellow(`Saved ${answers.length}/${QUESTIONS.length} answers. Re-run to resume.\n`),
        );
        return filePath;
      }

      const body = res.command === 'skip' ? '' : res.body;
      answers.push({ id: q.id, title: q.title, body });
      appendAnswerToFile(filePath, q, body);

      if (res.command === 'skip') {
        process.stdout.write(chalk.dim('  (skipped)\n'));
      }

      i += 1;
    }
  } finally {
    rl.close();
  }

  process.stdout.write(
    '\n' +
      chalk.green.bold('Done.') +
      ` Saved to ${chalk.cyan(filePath)}\n` +
      chalk.dim('Next: run ') +
      chalk.bold('npm run start') +
      chalk.dim(' (without --interview) to process + chunk, then ') +
      chalk.bold('/extract-soul') +
      chalk.dim(' in Claude Code.\n'),
  );
  return filePath;
}
