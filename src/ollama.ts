// Network rejection (most often ECONNREFUSED — local Ollama isn't running). The
// raw cause is kept for logs; callers map this to a friendly user-facing message.
export class OllamaUnavailableError extends Error {
  constructor(host: string, options?: { cause?: unknown }) {
    super(`Ollama server at ${host} is not reachable.`, options);
    this.name = 'OllamaUnavailableError';
  }
}

// Reached the server but it returned non-2xx. Raw body lives in `cause` (logs only).
export class OllamaRequestError extends Error {
  status: number;
  constructor(status: number, options?: { cause?: unknown }) {
    super(`Ollama request failed (HTTP ${status}).`, options);
    this.name = 'OllamaRequestError';
    this.status = status;
  }
}

export interface OllamaOptions {
  host: string;
  model: string;
  numCtx: number;
  temperature: number;
  seed: number;
  // When set, sent as `Authorization: Bearer <apiKey>` — required for Ollama
  // Cloud (https://ollama.com), ignored by a local server.
  apiKey?: string;
  // Per-request timeout (ms). A hung server would otherwise block up to Fastify's
  // request ceiling. Omitted (e.g. by the eval cache path) → no timeout.
  timeoutMs?: number;
}

const MAX_ATTEMPTS = 3;

function authHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

function baseUrl(host: string): string {
  return host.replace(/\/$/, '');
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Retry on transient failure (network/timeout → OllamaUnavailableError, or 5xx)
 *  but NOT on 4xx (bad request / model-not-found won't fix themselves). The map
 *  cache means a retried whole-run still skips already-finished chunks. */
function isRetryable(err: unknown): boolean {
  if (err instanceof OllamaUnavailableError) return true;
  if (err instanceof OllamaRequestError) return err.status >= 500;
  return false;
}

export async function generate(opts: OllamaOptions, prompt: string): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await generateOnce(opts, prompt);
    } catch (err) {
      lastErr = err;
      if (attempt === MAX_ATTEMPTS || !isRetryable(err)) throw err;
      // Exponential backoff: 500ms, 1000ms before the 2nd/3rd attempts.
      await sleep(500 * 2 ** (attempt - 1));
    }
  }
  throw lastErr;
}

async function generateOnce(opts: OllamaOptions, prompt: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl(opts.host)}/api/generate`, {
      method: 'POST',
      headers: authHeaders(opts.apiKey),
      // AbortSignal.timeout fires an AbortError (a network-style rejection) that
      // lands in the catch below and is treated as retryable/unavailable.
      signal: opts.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : undefined,
      body: JSON.stringify({
        model: opts.model,
        prompt,
        stream: false,
        options: { temperature: opts.temperature, num_ctx: opts.numCtx, seed: opts.seed },
      }),
    });
  } catch (err) {
    // fetch rejects on network failure (ECONNREFUSED, DNS, TLS) or timeout abort —
    // the #1 case is a local Ollama server that isn't running. Raw error for logs.
    throw new OllamaUnavailableError(opts.host, { cause: err });
  }
  if (!res.ok) {
    throw new OllamaRequestError(res.status, { cause: await res.text().catch(() => '') });
  }
  const json = (await res.json()) as { response?: string };
  if (typeof json.response !== 'string') {
    throw new Error('Ollama response missing `response` field');
  }
  return json.response;
}

export interface PingResult {
  ok: boolean;
  /** Set when ok=false: a short, user-facing reason. */
  reason?: string;
}

/**
 * Preflight: hit `${host}/api/tags`, assert the configured model is available.
 * Used at the top of extraction (fail before any work) and for the UI readiness
 * gate. Never throws — returns a structured result so a hung server can't block.
 */
export async function pingOllama(opts: {
  host: string;
  model: string;
  apiKey?: string;
  timeoutMs?: number;
}): Promise<PingResult> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl(opts.host)}/api/tags`, {
      headers: authHeaders(opts.apiKey),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 5000),
    });
  } catch {
    return { ok: false, reason: 'The Ollama server is not reachable — is it running?' };
  }
  if (!res.ok) {
    return { ok: false, reason: 'The Ollama server returned an error on health check.' };
  }
  // With a cloud API key the backend is Ollama Cloud (ollama.com): /api/tags
  // there lists the catalog under bare names (e.g. `gpt-oss:120b`), NOT the
  // `-cloud`-suffixed id we address it by, and models are served remotely (never
  // "pulled"). So the tag list is not authoritative for cloud — reachability is
  // enough; a genuinely-wrong model name surfaces as a clean error at generate.
  if (opts.apiKey) return { ok: true };

  // Local server: /api/tags IS authoritative, so assert the model is pulled.
  let models: string[] = [];
  try {
    const json = (await res.json()) as { models?: Array<{ name?: string; model?: string }> };
    models = (json.models ?? []).flatMap((m) => [m.name, m.model].filter(Boolean) as string[]);
  } catch {
    return { ok: false, reason: 'Could not read the Ollama model list.' };
  }
  if (models.length > 0 && !models.includes(opts.model)) {
    return {
      ok: false,
      reason: `The model "${opts.model}" is not pulled — run \`ollama pull ${opts.model}\`.`,
    };
  }
  return { ok: true };
}
