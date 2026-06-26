// Transient conversation statistics — a no-LLM, purely algorithmic analysis of
// a pasted/uploaded chat export. The conversation text itself is NEVER stored:
// it arrives over the wire, is parsed + reduced to these aggregate numbers here,
// and is discarded. Only the derived ConversationStats can later be persisted
// (see the saved_stats table). Idea adapted from the Yappinator project, ported
// to TypeScript with no moment.js and generalized past a fixed two-person model.

/** One parsed line of a chat export. `date` is null when the timestamp could
 *  not be parsed — the message still counts, but is skipped for time stats. */
export interface ParsedMessage {
  date: Date | null;
  sender: string;
  content: string;
}

export interface ParticipantStat {
  name: string;
  messageCount: number;
  wordCount: number;
  charCount: number;
  /** Mean minutes to reply when this person follows the other speaker. null if
   *  they never took a turn after someone else (no measurable response). */
  avgResponseMinutes: number | null;
  topWords: { word: string; count: number }[];
}

export interface ConversationStats {
  totalMessages: number;
  /** Messages with a parseable timestamp (the denominator for time stats). */
  datedMessages: number;
  participantCount: number;
  dateRange: { start: string; end: string } | null; // ISO 8601
  /** Per-participant, sorted by message count descending. */
  participants: ParticipantStat[];
  messagesPerMonth: { months: string[]; series: { name: string; counts: number[] }[] };
  redFlags: string[];
}

// 3+ char tokens, lowercased, common English filler removed. Unicode-aware so a
// stray accented character in someone's chat doesn't truncate a word.
const WORD_RE = /[\p{L}\p{N}'\-_]{3,}/gu;
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
  'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how',
  'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy',
  'did', 'man', 'any', 'too', 'yes', 'yet', 'this', 'that', 'with', 'have',
  'just', 'like', 'what', 'your', 'they', 'them', 'from', 'will', 'about',
]);

// A reply only counts toward "average response time" if it lands within this
// window of the prior message. Longer gaps are a new conversation session, not a
// response — counting them drags the mean into the absurd (a reply two weeks
// later isn't a "response time"). 6h is a generous same-session bound.
const RESPONSE_WINDOW_MINUTES = 6 * 60;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Placeholder bodies WhatsApp/Telegram leave when an attachment is stripped on
// export — they aren't real authored words, so they're dropped. Matched against
// the WHOLE (normalized) body, never as a substring: a real message that merely
// mentions one of these phrases must survive. iOS prefixes them with a LTR mark.
const MEDIA_MARKERS = ['<media omitted>', 'image omitted', 'video omitted', 'audio omitted', 'sticker omitted', 'gif omitted', 'document omitted', 'contact card omitted'];

function isMediaPlaceholder(content: string): boolean {
  const norm = content.replace(/‎/g, '').trim().toLowerCase();
  return MEDIA_MARKERS.includes(norm);
}

// A message-start line is either bracketed (iOS: "[12/01/2024, 10:00:00] X: …")
// or dash-delimited (Android: "12/01/2024, 10:00 - X: …"). The timestamp is
// captured loosely; parseTimestamp does the real work.
const BRACKET_RE = /^\[([^\]]+)\]\s+(.*)$/;
const DASH_RE = /^(\d{1,4}[./-]\d{1,2}[./-]\d{1,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap]\.?\s?[Mm]\.?)?)\s+-\s+(.*)$/;

interface DateParts {
  a: number; // first date component
  b: number; // second date component
  year: number;
  hour: number;
  minute: number;
}

// Pull the date/time components out of a timestamp string without committing to
// day-first vs month-first yet — that ambiguity is resolved across the whole
// file (see resolveOrder).
function splitTimestamp(ts: string): DateParts | null {
  const m = ts
    .trim()
    .match(/^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4}),?\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*([APap])\.?\s?[Mm]?\.?/) ||
    ts
      .trim()
      .match(/^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4}),?\s+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  let a = Number(m[1]);
  const b = Number(m[2]);
  let year = Number(m[3]);
  let hour = Number(m[4]);
  const minute = Number(m[5]);
  const ampm = m[6]?.toLowerCase();
  if (ampm === 'p' && hour < 12) hour += 12;
  if (ampm === 'a' && hour === 12) hour = 0;
  // ISO-ish "YYYY/MM/DD" exports put the 4-digit year first.
  if (a > 31 && year <= 31) {
    const t = a;
    a = year;
    year = t;
  }
  if (year < 100) year += 2000;
  return { a, b, year, hour, minute };
}

// Decide, once for the whole file, whether dates are day-first or month-first.
// A component > 12 is decisive; conflicts and ties default to day-first (the
// international WhatsApp default).
function resolveDayFirst(parts: DateParts[]): boolean {
  let dayFirst = false;
  let monthFirst = false;
  for (const p of parts) {
    if (p.a > 12) dayFirst = true;
    if (p.b > 12) monthFirst = true;
  }
  if (dayFirst && !monthFirst) return true;
  if (monthFirst && !dayFirst) return false;
  return true; // tie / ambiguous → day-first
}

function toDate(p: DateParts, dayFirst: boolean): Date | null {
  const day = dayFirst ? p.a : p.b;
  const month = dayFirst ? p.b : p.a;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // UTC so month bucketing is stable regardless of where the server runs.
  const d = new Date(Date.UTC(p.year, month - 1, day, p.hour, p.minute));
  if (Number.isNaN(d.getTime())) return null;
  // Date.UTC *normalizes* overflow (Feb 31 → Mar 2), which would fabricate a
  // valid-looking timestamp from an impossible one. Round-trip to reject it so
  // the message still counts but is excluded from date-based stats (date=null).
  if (
    d.getUTCFullYear() !== p.year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return d;
}

/** Parse a WhatsApp/Telegram-style text export into messages. Lines that don't
 *  start a new message are folded into the previous message (multi-line). Lines
 *  with a timestamp but no "Sender: " (system notices) are dropped. */
export function parseConversation(input: string): ParsedMessage[] {
  const lines = input.split(/\r?\n/);

  // First pass: split each line into (timestamp, rest) without parsing dates.
  interface Raw { ts: string; sender: string; content: string }
  const raws: Raw[] = [];
  let current: Raw | null = null;

  for (const line of lines) {
    const bm = BRACKET_RE.exec(line);
    const dm = bm ? null : DASH_RE.exec(line);
    const match = bm ?? dm;
    if (match) {
      const ts = match[1];
      const rest = match[2];
      const sep = rest.indexOf(': ');
      if (sep === -1) {
        // Timestamped system line (e.g. "Messages are end-to-end encrypted").
        current = null;
        continue;
      }
      if (current) raws.push(current);
      current = { ts, sender: rest.slice(0, sep).trim(), content: rest.slice(sep + 2) };
    } else if (current) {
      current.content += '\n' + line;
    }
  }
  if (current) raws.push(current);

  // Second pass: resolve the file-wide date order, then build messages.
  const partsByIndex = raws.map((r) => splitTimestamp(r.ts));
  const dayFirst = resolveDayFirst(partsByIndex.filter((p): p is DateParts => p !== null));

  const messages: ParsedMessage[] = [];
  for (let i = 0; i < raws.length; i++) {
    const r = raws[i];
    const content = r.content.trim();
    if (content.length === 0) continue;
    if (isMediaPlaceholder(content)) continue;
    const parts = partsByIndex[i];
    messages.push({
      date: parts ? toDate(parts, dayFirst) : null,
      sender: r.sender,
      content,
    });
  }
  return messages;
}

function tokenize(text: string): string[] {
  const matched = text.toLowerCase().match(WORD_RE);
  if (!matched) return [];
  return matched.filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function topWords(words: string[], n: number): { word: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  return [...counts.entries()]
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .slice(0, n)
    .map(([word, count]) => ({ word, count }));
}

/** Compute the full statistics bundle from parsed messages. Pure + LLM-free. */
export function computeStats(messages: ParsedMessage[]): ConversationStats {
  const senders = [...new Set(messages.map((m) => m.sender))];

  // Per-participant accumulation.
  const words = new Map<string, string[]>();
  const msgCount = new Map<string, number>();
  const charCount = new Map<string, number>();
  const responseTimes = new Map<string, number[]>();
  for (const s of senders) {
    words.set(s, []);
    msgCount.set(s, 0);
    charCount.set(s, 0);
    responseTimes.set(s, []);
  }

  let datedMessages = 0;
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    msgCount.set(m.sender, (msgCount.get(m.sender) ?? 0) + 1);
    charCount.set(m.sender, (charCount.get(m.sender) ?? 0) + m.content.length);
    words.get(m.sender)!.push(...tokenize(m.content));

    if (m.date) {
      datedMessages++;
      if (!minDate || m.date < minDate) minDate = m.date;
      if (!maxDate || m.date > maxDate) maxDate = m.date;
      // Response time: this message follows a turn by a different speaker.
      const prev = messages[i - 1];
      if (prev?.date && prev.sender !== m.sender) {
        const mins = (m.date.getTime() - prev.date.getTime()) / 60000;
        if (mins >= 0 && mins <= RESPONSE_WINDOW_MINUTES) responseTimes.get(m.sender)!.push(mins);
      }
    }
  }

  const wordCount = new Map<string, number>();
  for (const s of senders) wordCount.set(s, words.get(s)!.length);

  const participants: ParticipantStat[] = senders
    .map((name) => {
      const rt = responseTimes.get(name)!;
      const avg = rt.length > 0 ? rt.reduce((a, b) => a + b, 0) / rt.length : null;
      return {
        name,
        messageCount: msgCount.get(name) ?? 0,
        wordCount: wordCount.get(name) ?? 0,
        charCount: charCount.get(name) ?? 0,
        avgResponseMinutes: avg === null ? null : Math.round(avg * 10) / 10,
        topWords: topWords(words.get(name)!, 5),
      };
    })
    .sort((a, b) => b.messageCount - a.messageCount);

  return {
    totalMessages: messages.length,
    datedMessages,
    participantCount: senders.length,
    dateRange:
      minDate && maxDate
        ? { start: minDate.toISOString(), end: maxDate.toISOString() }
        : null,
    participants,
    messagesPerMonth: messagesPerMonth(messages, participants.map((p) => p.name)),
    redFlags: detectRedFlags(messages, participants),
  };
}

function messagesPerMonth(
  messages: ParsedMessage[],
  senders: string[],
): { months: string[]; series: { name: string; counts: number[] }[] } {
  // Keyed by a sortable 'YYYY-MM' so the chart is chronological even when the
  // export isn't already date-sorted (merged/edited files); the display label
  // is derived from the same key.
  const buckets = new Map<string, Map<string, number>>(); // 'YYYY-MM' → sender → count
  for (const m of messages) {
    if (!m.date) continue;
    const key = `${m.date.getUTCFullYear()}-${String(m.date.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!buckets.has(key)) buckets.set(key, new Map());
    const bucket = buckets.get(key)!;
    bucket.set(m.sender, (bucket.get(m.sender) ?? 0) + 1);
  }
  const sortedKeys = [...buckets.keys()].sort();
  const label = (key: string): string => {
    const [year, month] = key.split('-');
    return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
  };
  return {
    months: sortedKeys.map(label),
    series: senders.map((name) => ({
      name,
      counts: sortedKeys.map((k) => buckets.get(k)!.get(name) ?? 0),
    })),
  };
}

// Behavioural heuristics, generalized to the two most active participants.
function detectRedFlags(messages: ParsedMessage[], participants: ParticipantStat[]): string[] {
  const flags: string[] = [];
  if (messages.length === 0) return ['No messages were recognized in this conversation.'];

  // Longest uninterrupted monologue (same speaker, consecutive messages).
  let streak = 1;
  let maxStreak = 1;
  let monologuer = messages[0].sender;
  for (let i = 1; i < messages.length; i++) {
    if (messages[i].sender === messages[i - 1].sender) {
      streak++;
      if (streak > maxStreak) {
        maxStreak = streak;
        monologuer = messages[i].sender;
      }
    } else {
      streak = 1;
    }
  }
  if (maxStreak >= 5) {
    flags.push(`${monologuer} sent a run of ${maxStreak} messages in a row without a reply.`);
  }

  // One-sidedness: top speaker carries >65% of the messages (two-party view).
  const top2 = participants.slice(0, 2);
  if (top2.length === 2) {
    const total = top2[0].messageCount + top2[1].messageCount;
    if (total > 0) {
      const pct = Math.round((top2[0].messageCount / total) * 100);
      if (pct > 65) {
        flags.push(`One-sided: ${top2[0].name} sent ${pct}% of the messages.`);
      }
    }
  }

  // Ghosting: gaps of 24h+ between consecutive dated messages.
  let ghostCount = 0;
  let prevDate: Date | null = null;
  for (const m of messages) {
    if (!m.date) continue;
    if (prevDate) {
      const hours = (m.date.getTime() - prevDate.getTime()) / 3_600_000;
      if (hours > 24) ghostCount++;
    }
    prevDate = m.date;
  }
  if (ghostCount > 0) {
    flags.push(`Went quiet for 24h+ on ${ghostCount} occasion${ghostCount === 1 ? '' : 's'}.`);
  }

  return flags.length > 0 ? flags : ['No red flags detected. Healthy back-and-forth.'];
}

/** Convenience: parse raw export text and compute stats in one call. */
export function analyzeConversation(input: string): ConversationStats {
  return computeStats(parseConversation(input));
}
