export interface OllamaOptions {
  host: string;
  model: string;
  numCtx: number;
  temperature: number;
}

export async function generate(opts: OllamaOptions, prompt: string): Promise<string> {
  const res = await fetch(`${opts.host.replace(/\/$/, '')}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      prompt,
      stream: false,
      options: { temperature: opts.temperature, num_ctx: opts.numCtx },
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
