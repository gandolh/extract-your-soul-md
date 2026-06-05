import { appendFileSync, mkdirSync } from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { color } from '../color.js';
import { QUESTIONS, type Question } from '../questions.js';
import type { Config } from '../config.js';
import {
  renderSection,
  parseAnswersFile,
  writeAnswersFile,
  type RecordedAnswer,
} from '../answers-file.js';

const SAVED_BY = '`npm run start -- --interview`';

export interface InterviewOptions {
  englishPrimary: boolean;
}

function parseExistingAnswers(filePath: string): Map<string, RecordedAnswer> {
  return parseAnswersFile(filePath);
}

// Truncate to a header-only file. The REPL then appends one section per
// answered question (crash-safe) via appendAnswerToFile.
function writeFreshFile(filePath: string): void {
  writeAnswersFile(filePath, [], SAVED_BY);
}

function appendAnswerToFile(filePath: string, q: Question, body: string): void {
  appendFileSync(filePath, renderSection(q, body), 'utf8');
}

function rewriteFile(filePath: string, answers: RecordedAnswer[]): void {
  writeAnswersFile(filePath, answers, SAVED_BY);
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
          color.dim(
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
  const optionalTag = q.optional ? color.dim(' (optional)') : '';

  const lines = [
    '',
    color.cyan.bold(`[${idx + 1}/${total}] ${q.id} — ${q.title}`) + optionalTag,
    color.white(primary),
    color.dim(secondary),
  ];
  if (primaryHint) lines.push(color.dim(`(${primaryHint})`));
  lines.push(
    color.dim('Press Enter twice on an empty line to submit · :skip · :back · :quit · :help'),
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
      color.yellow(
        `Found existing answers (${answeredIds.length} answered: ${answeredIds.join(', ')}).\n`,
      ),
    );
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const choice = (await ask(rl, color.bold('Resume from where you left off? [Y/n/restart]: ')))
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
        process.stdout.write(color.green('All questions already answered. Nothing to do.\n'));
        return filePath;
      }
      rewriteFile(filePath, answers);
    }
  } else {
    writeFreshFile(filePath);
  }

  process.stdout.write(
    '\n' +
      color.bold('Soul Questionnaire') +
      '\n' +
      color.dim(
        `${QUESTIONS.length} questions (~20 minutes). Answers save as you go to ${filePath}.\n`,
      ) +
      color.dim('You can stop any time with :quit and resume later.\n'),
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
          process.stdout.write(color.yellow('Already at the first question.\n'));
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
          color.yellow(`Saved ${answers.length}/${QUESTIONS.length} answers. Re-run to resume.\n`),
        );
        return filePath;
      }

      const body = res.command === 'skip' ? '' : res.body;
      answers.push({ id: q.id, title: q.title, body });
      appendAnswerToFile(filePath, q, body);

      if (res.command === 'skip') {
        process.stdout.write(color.dim('  (skipped)\n'));
      }

      i += 1;
    }
  } finally {
    rl.close();
  }

  process.stdout.write(
    '\n' +
      color.green.bold('Done.') +
      ` Saved to ${color.cyan(filePath)}\n` +
      color.dim('Next: run ') +
      color.bold('npm run start') +
      color.dim(' (without --interview) to process + chunk, then ') +
      color.bold('/extract-soul') +
      color.dim(' in Claude Code.\n'),
  );
  return filePath;
}
