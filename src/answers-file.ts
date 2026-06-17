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

const CHOICE_LINE_RE = /^choice:\s*(.*)$/i;
const NOTE_LINE_RE = /^note:\s*$/i;

export interface ChoiceAnswer {
  values: string[]; // picked option value(s); [] if unanswered
  note: string; // optional free-text
}

/** Encode a choice answer into a section body. Empty selection + empty note
 *  yields '' so it round-trips as skipped. */
export function encodeChoiceBody(values: string[], note: string): string {
  const picked = values.filter((v) => v.trim().length > 0);
  const trimmedNote = note.trim();
  if (picked.length === 0 && trimmedNote.length === 0) return '';
  const lines = [`choice: ${picked.join(', ')}`];
  if (trimmedNote.length > 0) {
    lines.push('note:');
    lines.push(trimmedNote);
  }
  return lines.join('\n');
}

/** Parse a section body written by encodeChoiceBody. Tolerant: a body with no
 *  `choice:` line (e.g. a hand-edited free-text answer) yields no values and
 *  treats the whole body as the note. */
export function decodeChoiceBody(body: string): ChoiceAnswer {
  const lines = body.split(/\r?\n/);
  let values: string[] = [];
  const noteLines: string[] = [];
  let seenChoice = false;
  let inNote = false;
  for (const line of lines) {
    if (!seenChoice) {
      const m = line.match(CHOICE_LINE_RE);
      if (m) {
        values = m[1]
          .split(',')
          .map((v) => v.trim())
          .filter((v) => v.length > 0);
        seenChoice = true;
        continue;
      }
    }
    if (!inNote && NOTE_LINE_RE.test(line)) {
      inNote = true;
      continue;
    }
    if (inNote || !seenChoice) noteLines.push(line);
  }
  return { values, note: noteLines.join('\n').trim() };
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
