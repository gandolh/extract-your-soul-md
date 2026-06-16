export interface OllamaOptions {
  host: string;
  model: string;
  numCtx: number;
  temperature: number;
  seed: number;
  // When set, sent as `Authorization: Bearer <apiKey>` — required for Ollama
  // Cloud (https://ollama.com), ignored by a local server.
  apiKey?: string;
}

export async function generate(opts: OllamaOptions, prompt: string): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.apiKey) headers.Authorization = `Bearer ${opts.apiKey}`;
  const res = await fetch(`${opts.host.replace(/\/$/, '')}/api/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: opts.model,
      prompt,
      stream: false,
      options: { temperature: opts.temperature, num_ctx: opts.numCtx, seed: opts.seed },
    }),
  });
  if (!res.ok) {
    throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { response?: string };
  if (typeof json.response !== 'string') {
    throw new Error('Ollama response missing `response` field');
  }
  return json.response;
}
