// Shared writer/parser for `inputs/questionnaire/answers.md`.
//
// Both the CLI REPL (src/stages/interview.ts) and the web form
// (src/stages/web.ts) produce this file, so the format lives here in one
// place. The downstream parser in src/stages/process.ts keys off the
// `## Qn — Title` headers and the `[skipped]` marker — keep those stable.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { QUESTIONS, type Question } from './questions.js';

export const SKIPPED_MARKER = '[skipped]';

export interface RecordedAnswer {
  id: string;
  title: string;
  body: string;
}

export function sectionHeader(q: Pick<Question, 'id' | 'title'>): string {
  return `## ${q.id} — ${q.title}`;
}

export function fileHeader(savedBy: string): string {
  return (
    `# Soul Questionnaire — ${new Date().toISOString()}\n\n` +
    `<!-- Saved by ${savedBy}. Skipped answers are marked ${SKIPPED_MARKER}. -->\n\n`
  );
}

export function renderSection(q: Pick<Question, 'id' | 'title'>, body: string): string {
  return `${sectionHeader(q)}\n\n${body.trim() || SKIPPED_MARKER}\n\n`;
}

/**
 * Write a complete answers.md from a full set of answers, ordered to match
 * QUESTIONS. Used by the web form (which submits everything at once) and by
 * the REPL's resume/rewrite path.
 */
export function writeAnswersFile(
  filePath: string,
  answers: ReadonlyArray<RecordedAnswer>,
  savedBy: string,
): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const byId = new Map(answers.map((a) => [a.id, a]));
  let out = fileHeader(savedBy);
  for (const q of QUESTIONS) {
    const a = byId.get(q.id);
    // Only emit sections we actually have an entry for; an absent question is
    // treated the same as an explicit skip so the file stays self-describing.
    if (a) out += renderSection(q, a.body);
  }
  writeFileSync(filePath, out, 'utf8');
}

const HEADER_RE = /^##\s+(Q\d+)\s+—\s+(.+)$/;

/** Parse an existing answers.md into a map keyed by question id. */
export function parseAnswersFile(filePath: string): Map<string, RecordedAnswer> {
  const out = new Map<string, RecordedAnswer>();
  if (!existsSync(filePath)) return out;
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  let current: { id: string; title: string; lines: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    out.set(current.id, {
      id: current.id,
      title: current.title,
      body: current.lines.join('\n').trim(),
    });
  };
  for (const line of lines) {
    const m = line.match(HEADER_RE);
    if (m) {
      flush();
      current = { id: m[1], title: m[2].trim(), lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  flush();
  return out;
}
