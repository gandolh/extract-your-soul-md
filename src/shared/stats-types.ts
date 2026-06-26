// The shape of computed conversation statistics — the contract between the
// server analyzer (src/stats/conversation-stats.ts), the route's zod validator
// (src/server/routes/stats.ts), and the frontend (client.ts, StatsDashboard).
// Defined once here and imported by both roots via `@shared` so they can't
// drift. Pure types: erased at compile time.

export interface ParticipantStat {
  name: string;
  messageCount: number;
  wordCount: number;
  charCount: number;
  /** Mean minutes to reply within a conversation session; null if never. */
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
