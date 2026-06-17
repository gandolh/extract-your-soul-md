// Frontend mirror of src/answers-file.ts's choice-body encode/decode. The two
// tsconfigs don't share a module graph, so we keep a tiny parallel copy rather
// than wiring a cross-root import. Keep this in sync with the server version —
// the format (a `choice:` line + optional `note:` block) is the contract.

export interface ChoiceAnswer {
  values: string[];
  note: string;
}

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

export function decodeChoiceBody(body: string): ChoiceAnswer {
  const lines = body.split(/\r?\n/);
  let values: string[] = [];
  const noteLines: string[] = [];
  let seenChoice = false;
  let inNote = false;
  for (const line of lines) {
    if (!seenChoice) {
      const m = line.match(/^choice:\s*(.*)$/i);
      if (m) {
        values = m[1]
          .split(',')
          .map((v) => v.trim())
          .filter((v) => v.length > 0);
        seenChoice = true;
        continue;
      }
    }
    if (!inNote && /^note:\s*$/i.test(line)) {
      inNote = true;
      continue;
    }
    if (inNote || !seenChoice) noteLines.push(line);
  }
  return { values, note: noteLines.join('\n').trim() };
}
