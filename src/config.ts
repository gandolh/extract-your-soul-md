import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

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
  INPUTS_FREEFORM_DIR: z.string().min(1).default('inputs/freeform'),
  INPUTS_PROCESSED_DIR: z.string().min(1).default('inputs/processed'),
  CHUNKS_DIR: z.string().min(1).default('chunks'),
  OUT_DIR: z.string().min(1).default('out'),
  MY_NAMES_FILE: z.string().min(1).default('inputs/my-names.txt'),

  CHUNK_TARGET_TOKENS: intFromEnv.pipe(z.number().int().positive().default(30_000)),
  MIN_MESSAGE_LENGTH: intFromEnv.pipe(z.number().int().nonnegative().default(3)),
  DROP_URLS: boolFromEnv.pipe(z.boolean().default(true)),
  DROP_MEDIA_PLACEHOLDERS: boolFromEnv.pipe(z.boolean().default(true)),

  OLLAMA_HOST: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().min(1).default('llama3.1:8b'),
  OLLAMA_NUM_CTX: intFromEnv.pipe(z.number().int().positive().default(8192)),
  OLLAMA_TEMPERATURE: intFromEnv.pipe(z.number().min(0).max(2).default(0.3)),
});

export type Config = {
  inputsFreeformDir: string;
  inputsProcessedDir: string;
  chunksDir: string;
  outDir: string;
  myNamesFile: string;
  chunkTargetTokens: number;
  minMessageLength: number;
  dropUrls: boolean;
  dropMediaPlaceholders: boolean;
  ollamaHost: string;
  ollamaModel: string;
  ollamaNumCtx: number;
  ollamaTemperature: number;
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
    inputsFreeformDir: e.INPUTS_FREEFORM_DIR,
    inputsProcessedDir: e.INPUTS_PROCESSED_DIR,
    chunksDir: e.CHUNKS_DIR,
    outDir: e.OUT_DIR,
    myNamesFile: e.MY_NAMES_FILE,
    chunkTargetTokens: e.CHUNK_TARGET_TOKENS,
    minMessageLength: e.MIN_MESSAGE_LENGTH,
    dropUrls: e.DROP_URLS,
    dropMediaPlaceholders: e.DROP_MEDIA_PLACEHOLDERS,
    ollamaHost: e.OLLAMA_HOST,
    ollamaModel: e.OLLAMA_MODEL,
    ollamaNumCtx: e.OLLAMA_NUM_CTX,
    ollamaTemperature: e.OLLAMA_TEMPERATURE,
  });
}

export function loadMyNames(myNamesFile: string): string[] {
  const abs = path.resolve(myNamesFile);
  if (!existsSync(abs)) {
    throw new Error(
      `My-names file not found at ${abs}. Create it with one name per line (the names that appear as "you" in WhatsApp exports).`,
    );
  }
  const lines = readFileSync(abs, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
  if (lines.length === 0) {
    throw new Error(`My-names file at ${abs} is empty.`);
  }
  return lines;
}
