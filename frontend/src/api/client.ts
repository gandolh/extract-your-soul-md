// Thin fetch wrapper. Same-origin in dev (Vite proxies /api → Fastify) and in
// prod (Fastify serves both), so cookies ride along with credentials:'include'.

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

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new ApiError(0, 'The request timed out. Check your connection and try again.');
    }
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? `Request failed (${res.status}).`);
  }
  return data as T;
}

export interface User { id: number; username: string; }
export type StudyBand = 'voice' | 'profile';
export type ReportKey = 'big-five' | 'honesty-tone' | 'pcm' | 'mbti';
export interface StudySummary {
  id: string; title: string; description: string;
  band: StudyBand; reportKey: ReportKey | null;
  total: number; completed: number;
}
export interface ChoiceOption { value: string; labelEn: string; labelRo: string; }
export interface StudyQuestion {
  id: string; slug: string; title: string;
  promptEn: string; promptRo: string;
  hintEn: string | null; hintRo: string | null;
  optional: boolean; savedBody: string;
  kind: 'text' | 'choice';
  choiceMode: 'scale' | 'single' | null;
  leftEn: string | null; leftRo: string | null;
  rightEn: string | null; rightRo: string | null;
  choices: ChoiceOption[] | null;
}
export interface StudyDetail {
  study: { id: string; title: string; description: string; band: StudyBand; reportKey: ReportKey | null };
  questions: StudyQuestion[];
}
export interface ReportAxis { key: string; label: string; percent: number; readout: string; answered: number; }
export interface ReportPayload {
  key: ReportKey; title: string; axes: ReportAxis[];
  summary: string; hasData: boolean; caveat: string;
}
export interface ReportState { key: ReportKey; payload: ReportPayload | null; includeInSoul: boolean; }
export interface Conversation { id: number; filename: string; createdAt: string; }
export interface DetectedSender { name: string; normalized: string; count: number; }
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

export type EvalCondition = 'A' | 'B' | 'C';
export interface MetricBundle {
  burstinessDelta: number;
  sentenceLengthVarianceDelta: number;
  typeTokenRatioDelta: number;
  functionWordDistance: number;
  charDistributionDistance: number;
}
export interface EvalSample {
  prefix: string;
  realContinuation: string;
  generated: Record<EvalCondition, string>;
  scores: Record<EvalCondition, MetricBundle>;
}
export interface EvalResult {
  n: number;
  k: number;
  conditionLabels: Record<EvalCondition, string>;
  aggregate: Record<EvalCondition, MetricBundle>;
  samples: EvalSample[];
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

  // reports
  reports: () => request<{ reports: ReportState[] }>('GET', '/reports'),
  setReportInclude: (key: ReportKey, includeInSoul: boolean) =>
    request<{ ok: boolean }>('POST', `/reports/${key}/include`, { includeInSoul }),

  // conversations + names
  conversations: () => request<{ conversations: Conversation[] }>('GET', '/conversations'),
  addConversation: (filename: string, content: string) =>
    request<{ conversation: { id: number; filename: string } }>('POST', '/conversations', { filename, content }),
  deleteConversation: (id: number) => request<void>('DELETE', `/conversations/${id}`),
  senders: () => request<{ senders: DetectedSender[] }>('GET', '/conversations/senders'),
  names: () => request<{ names: string[] }>('GET', '/names'),
  setNames: (names: string[]) => request<{ names: string[] }>('PUT', '/names', { names }),

  // results
  results: () => request<ResultsState>('GET', '/results'),
  extract: () => request<{ ok: boolean; jobId: number }>('POST', '/extract'),
  job: (jobId: number) => request<JobDetail>('GET', `/extract/${jobId}`),

  // eval
  evalStatus: () => request<{ running: boolean }>('GET', '/eval'),
  runEval: (params?: { n?: number; k?: number }) =>
    // Synchronous, multi-minute Ollama run — opt out of the request timeout.
    request<{ ok: boolean; result: EvalResult }>('POST', '/eval', params ?? {}, 0),
};
