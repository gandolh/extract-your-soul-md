// Axios client. Same-origin in dev (Vite proxies /api → Fastify) and in prod
// (Fastify serves both), so cookies ride along with withCredentials:true.

import axios, { AxiosError } from 'axios';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Default per-request timeout so a hung server can't wedge the tab forever. The
// eval run is synchronous and can take minutes, so it opts out (timeoutMs: 0).
const DEFAULT_TIMEOUT_MS = 30_000;

const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: DEFAULT_TIMEOUT_MS,
});

// Normalize every failure into an ApiError so callers keep the same contract
// (status + the server's `error` string) regardless of axios internals.
http.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ error?: string }>) => {
    if (err.response) {
      const status = err.response.status;
      const message = err.response.data?.error ?? `Request failed (${status}).`;
      return Promise.reject(new ApiError(status, message));
    }
    if (err.code === 'ECONNABORTED') {
      return Promise.reject(new ApiError(0, 'The request timed out. Check your connection and try again.'));
    }
    return Promise.reject(new ApiError(0, 'Could not reach the server. Check your connection and try again.'));
  },
);

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const res = await http.request<T>({
    method,
    url: path,
    data: body,
    // 0 means "no timeout" for both our callers and axios.
    timeout: timeoutMs,
  });
  return res.data;
}

export interface User { id: number; username: string; }
export type StudyBand = 'voice' | 'profile';
export type ReportKey =
  | 'big-five'
  | 'honesty-tone'
  | 'pcm'
  | 'mbti'
  | 'need-for-cognition'
  | 'values'
  | 'regulatory-focus'
  | 'locus-of-control';
export interface StudySummary {
  id: string; title: string; description: string;
  band: StudyBand; reportKey: ReportKey | null;
  total: number; completed: number;
  estimateMinutes: number;
}
export interface ChoiceOption { value: string; label: string; }
export interface StudyQuestion {
  id: string; slug: string; title: string;
  prompt: string;
  hint: string | null;
  optional: boolean; savedBody: string;
  kind: 'text' | 'choice';
  choiceMode: 'scale' | 'single' | null;
  left: string | null;
  right: string | null;
  choices: ChoiceOption[] | null;
}
export interface StudyDetail {
  study: { id: string; title: string; description: string; band: StudyBand; reportKey: ReportKey | null; estimateMinutes: number };
  questions: StudyQuestion[];
}
export interface AnsweredQuestion extends StudyQuestion { updatedAt: string; }
export interface AnswersStudy {
  id: string; title: string; band: StudyBand;
  answeredCount: number; totalCount: number;
  questions: AnsweredQuestion[];
}
export interface ReportAxis { key: string; label: string; percent: number; readout: string; answered: number; }
export interface ReportPayload {
  key: ReportKey; title: string; axes: ReportAxis[];
  summary: string; hasData: boolean; caveat: string;
}
export interface ReportState { key: ReportKey; payload: ReportPayload | null; includeInSoul: boolean; }
export type SwipeVerdict = 'yes' | 'no';
export interface SwipeCard { id: number; statement: string; verdict: SwipeVerdict | null; }
export interface SwipeState {
  cards: SwipeCard[];
  canGenerate: boolean; // has at least one study answer to build cards from
  ollamaReady: boolean;
  ollamaReason: string | null;
}
// ---- conversation statistics ---------------------------------------------
// The conversation is transient (computed server-side, never stored); only
// these derived numbers can be saved.
export interface ParticipantStat {
  name: string;
  messageCount: number;
  wordCount: number;
  charCount: number;
  avgResponseMinutes: number | null;
  topWords: { word: string; count: number }[];
}
export interface ConversationStats {
  totalMessages: number;
  datedMessages: number;
  participantCount: number;
  dateRange: { start: string; end: string } | null;
  participants: ParticipantStat[];
  messagesPerMonth: { months: string[]; series: { name: string; counts: number[] }[] };
  redFlags: string[];
}
export interface SavedStatSummary { id: number; name: string; created_at: string; }
export interface SavedStatDetail { id: number; name: string; createdAt: string; stats: ConversationStats; }

export interface SoulResult { soulMd: string; prevMd: string | null; extractor: string; createdAt: string | null; }
export type JobStatus = 'enqueued' | 'running' | 'done' | 'failed';
export interface JobProgress {
  id: number;
  status: JobStatus;
  stage: 'map' | 'reduce' | null;
  chunkDone: number;
  chunkTotal: number;
}
export interface JobDetail extends JobProgress { error: string | null; }
export interface ResultsState {
  canExtract: boolean;
  ollamaReady: boolean;
  ollamaReason: string | null;
  running: boolean;
  job: JobProgress | null;
  result: SoulResult | null;
}

export const api = {
  // auth
  me: () => request<{ user: User }>('GET', '/auth/me'),
  register: (username: string, password: string) =>
    request<{ user: User }>('POST', '/auth/register', { username, password }),
  login: (username: string, password: string) =>
    request<{ user: User }>('POST', '/auth/login', { username, password }),
  logout: () => request<void>('POST', '/auth/logout'),

  // studies
  studies: () => request<{ studies: StudySummary[] }>('GET', '/studies'),
  study: (id: string) => request<StudyDetail>('GET', `/studies/${id}`),
  saveStudy: (id: string, answers: Array<{ id: string; body: string }>) =>
    request<{ ok: boolean; answered: number; total: number }>(
      'POST',
      `/studies/${id}/answers`,
      { answers },
    ),

  // all answers the user has made, grouped by study (editable review page)
  answers: () => request<{ studies: AnswersStudy[] }>('GET', '/answers'),

  // reports
  reports: () => request<{ reports: ReportState[] }>('GET', '/reports'),
  setReportInclude: (key: ReportKey, includeInSoul: boolean) =>
    request<{ ok: boolean }>('POST', `/reports/${key}/include`, { includeInSoul }),

  // swipe cards ("does this sound like you?")
  swipe: () => request<SwipeState>('GET', '/swipe'),
  generateCards: () =>
    // Synchronous Ollama generation — can take a while; opt out of the timeout.
    request<{ cards: SwipeCard[] }>('POST', '/swipe/generate', {}, 0),
  setVerdict: (id: number, verdict: SwipeVerdict | null) =>
    request<{ ok: boolean }>('POST', `/swipe/${id}/verdict`, { verdict }),

  // conversation statistics (transient compute → optional save)
  computeStats: (conversation: string) =>
    request<{ stats: ConversationStats }>('POST', '/stats/compute', { conversation }),
  saveStats: (stats: ConversationStats, name?: string) =>
    request<{ id: number; name: string }>('POST', '/stats/save', { stats, name }),
  savedStats: () => request<{ saved: SavedStatSummary[] }>('GET', '/stats'),
  savedStat: (id: number) => request<SavedStatDetail>('GET', `/stats/${id}`),
  deleteSavedStat: (id: number) => request<{ ok: boolean }>('DELETE', `/stats/${id}`),

  // results
  results: () => request<ResultsState>('GET', '/results'),
  extract: () => request<{ ok: boolean; jobId: number }>('POST', '/extract'),
  job: (jobId: number) => request<JobDetail>('GET', `/extract/${jobId}`),
};
