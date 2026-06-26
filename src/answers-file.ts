// Shared writer/parser for `inputs/questionnaire/answers.md`.
//
// Both the CLI REPL (src/stages/interview.ts) and the web form
// (src/stages/web.ts) produce this file, so the format lives here in one
// place. The downstream parser in src/stages/process.ts keys off the
// `## Qn — Title` headers and the `[skipped]` marker — keep those stable.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { QUESTIONS, type Question } from './questions.js';

export const SKIPPED_MARKER = '[skipped]';

// Reserved synthetic question id for the swipe-card statements the user
// confirmed ("sounds like me"). Sits far above the real question ids (Q1..),
// and the downstream `Q\d+` parser accepts it, so confirmed statements ride the
// same questionnaire chunk as the studies answers with no new format surface.
export const CONFIRMED_STATEMENTS_ID = 'Q900';
export const CONFIRMED_STATEMENTS_TITLE = 'Statements the user confirmed describe them';

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

/**
 * Append the swipe-card statements the user endorsed as "sounds like me" to an
 * existing answers.md, as one reserved `## Q900 — …` section with the statements
 * as a bullet list. No-op when there are none. Called after writeAnswersFile so
 * the block lands at the end of the same file the questionnaire processor reads.
 */
export function appendConfirmedStatements(
  filePath: string,
  statements: ReadonlyArray<string>,
): void {
  const clean = statements.map((s) => s.trim()).filter((s) => s.length > 0);
  if (clean.length === 0) return;
  const body = clean.map((s) => `- ${s}`).join('\n');
  const section =
    `## ${CONFIRMED_STATEMENTS_ID} — ${CONFIRMED_STATEMENTS_TITLE}\n\n` +
    `These are first-person statements the user actively confirmed sound like them ` +
    `(endorsed in a yes/no card review). Treat them as high-confidence self-descriptions.\n\n` +
    `${body}\n\n`;
  appendFileSync(filePath, section, 'utf8');
}

// --- Choice-answer body encoding -------------------------------------------
// Choice questions still persist as a `## Qn — Title` section body, so the
// answers.md contract, the DB, and process.ts are untouched. The body carries
// a machine-readable `choice:` line (the picked value(s), comma-separated) and
// optional human prose after it. Example body:
//
//   choice: 4
//   note: especially sci-fi worldbuilding
//
// The `choice:` line is what the scorer reads; the prose is the dual-use voice
// sample. An empty body means unanswered (treated as skipped downstream).

// The choice-body format lives in the shared module so the web form imports the
// exact same encoder/decoder (no parallel fork to keep in sync).
export {
  type ChoiceAnswer,
  encodeChoiceBody,
  decodeChoiceBody,
} from './shared/choice-body.js';

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
