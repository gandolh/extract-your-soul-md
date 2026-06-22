import 'dotenv/config';
import { z } from 'zod';

// The dev fallback signing key. Exported so the prod startup guard (app.ts) can
// detect a deploy that never set a real SESSION_SECRET and refuse to sign cookies
// with a publicly-known, forgeable key. Generate a real one with `openssl rand -hex 32`.
export const DEV_SESSION_SECRET = 'dev-insecure-session-secret-change-me';

const boolFromEnv = z
  .string()
  .optional()
  .transform((v) => (v === undefined ? undefined : /^(1|true|yes|on)$/i.test(v)));

const intFromEnv = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (v === undefined) return undefined;
    const n = Number(v);
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: 'custom', message: `expected a number, got "${v}"` });
      return z.NEVER;
    }
    return n;
  });

const EnvSchema = z.object({
  INPUTS_PROCESSED_DIR: z.string().min(1).default('inputs/processed'),
  CHUNKS_DIR: z.string().min(1).default('chunks'),
  OUT_DIR: z.string().min(1).default('out'),
  QUESTIONNAIRE_DIR: z.string().min(1).default('inputs/questionnaire'),
  QUESTIONNAIRE_FILE: z.string().min(1).default('answers.md'),

  // Web-platform additions. The SQLite file is the source of truth for the
  // server; WORK_DIR holds the throwaway per-user pipeline scratch dirs.
  DB_PATH: z.string().min(1).default('data/soul.sqlite'),
  WORK_DIR: z.string().min(1).default('.work'),
  SERVER_PORT: intFromEnv.pipe(z.number().int().positive().default(4317)),
  SESSION_SECRET: z
    .string()
    .min(16, 'SESSION_SECRET must be at least 16 chars')
    .default(DEV_SESSION_SECRET),

  CHUNK_TARGET_TOKENS: intFromEnv.pipe(z.number().int().positive().default(30_000)),

  OLLAMA_HOST: z.string().url().default('https://ollama.com'),
  OLLAMA_MODEL: z.string().min(1).default('gpt-oss:120b-cloud'),
  // Bearer token for Ollama Cloud. Empty = local server (no auth header).
  OLLAMA_API_KEY: z.string().default(''),
  OLLAMA_NUM_CTX: intFromEnv.pipe(z.number().int().positive().default(32768)),
  OLLAMA_TEMPERATURE: intFromEnv.pipe(z.number().min(0).max(2).default(0)),
  // Per-request timeout for a single Ollama call (map or reduce). A hung server
  // would otherwise block up to Fastify's 15-min ceiling. 10 min default covers a
  // slow cloud reduce; transient blips are retried (see ollama.ts).
  OLLAMA_TIMEOUT_MS: intFromEnv.pipe(z.number().int().positive().default(600_000)),
});

export type Config = {
  inputsProcessedDir: string;
  chunksDir: string;
  outDir: string;
  questionnaireDir: string;
  questionnaireFile: string;
  dbPath: string;
  workDir: string;
  serverPort: number;
  sessionSecret: string;
  chunkTargetTokens: number;
  ollamaHost: string;
  ollamaModel: string;
  ollamaApiKey: string;
  ollamaNumCtx: number;
  ollamaTemperature: number;
  ollamaTimeoutMs: number;
};

export function loadConfig(): Config {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const e = parsed.data;
  return Object.freeze({
    inputsProcessedDir: e.INPUTS_PROCESSED_DIR,
    chunksDir: e.CHUNKS_DIR,
    outDir: e.OUT_DIR,
    questionnaireDir: e.QUESTIONNAIRE_DIR,
    questionnaireFile: e.QUESTIONNAIRE_FILE,
    dbPath: e.DB_PATH,
    workDir: e.WORK_DIR,
    serverPort: e.SERVER_PORT,
    sessionSecret: e.SESSION_SECRET,
    chunkTargetTokens: e.CHUNK_TARGET_TOKENS,
    ollamaHost: e.OLLAMA_HOST,
    ollamaModel: e.OLLAMA_MODEL,
    ollamaApiKey: e.OLLAMA_API_KEY,
    ollamaNumCtx: e.OLLAMA_NUM_CTX,
    ollamaTemperature: e.OLLAMA_TEMPERATURE,
    ollamaTimeoutMs: e.OLLAMA_TIMEOUT_MS,
  });
}
