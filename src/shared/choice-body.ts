// The choice-answer body format — a `choice:` line + optional `note:` block —
// is a load-bearing contract shared by the server (answers-file.ts, process.ts
// parser) and the web form (QuestionCard). It lives here, in one place, imported
// by both roots via the `@shared` alias, so the two can never silently drift.
// Pure: no Node or DOM dependencies.

export interface ChoiceAnswer {
  values: string[]; // picked option value(s); [] if unanswered
  note: string; // optional free-text
}

const CHOICE_LINE_RE = /^choice:\s*(.*)$/i;
const NOTE_LINE_RE = /^note:\s*$/i;

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
