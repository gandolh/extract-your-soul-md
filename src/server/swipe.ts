// Generates a deck of "does this sound like you?" cards for one user. The
// statements are produced by Ollama from the user's OWN material (study answers
// + scored trait profile + any prior soul.md), then the user swipes each yes/no
// and the confirmed ones are folded back into soul.md at extraction time.

import type { Config } from '../config.js';
import { SWIPE_CARD_PROMPT_HEADER } from '../prompts.js';
import { generate, pingOllama, OllamaUnavailableError } from '../ollama.js';
import { decodeChoiceBody } from '../answers-file.js';
import {
  getAnswersForUser,
  getLatestResult,
  insertSwipeCards,
  listSwipeCards,
  type SwipeCardRow,
} from '../db/repos.js';
import { buildProfileText } from './pipeline.js';

// Higher than extraction's temperature 0 — we WANT variety across cards and
// across regenerations, not a reproducible single answer.
const GEN_TEMPERATURE = 0.8;
const MAX_CARDS = 30;
const MIN_STATEMENT_LEN = 6;
const MAX_STATEMENT_LEN = 200;

/** Assemble the user's self-material for the generation prompt: free-text study
 *  answers (and any free-text notes on choice questions), their scored trait
 *  profile, and the most recent soul.md if one exists. */
function buildMaterial(userId: number): string {
  const parts: string[] = [];

  const answerBlocks: string[] = [];
  for (const a of getAnswersForUser(userId)) {
    const decoded = decodeChoiceBody(a.body);
    // For choice questions the scored value is opaque here (it's captured by the
    // trait profile below); keep only the free-text note. Free-text answers have
    // no `choice:` line, so decode yields the whole body as the note.
    const text = decoded.values.length > 0 ? decoded.note : a.body.trim();
    if (text.length > 0) answerBlocks.push(`## ${a.title}\n\n${text}`);
  }
  if (answerBlocks.length > 0) {
    parts.push('# Questionnaire answers\n\n' + answerBlocks.join('\n\n'));
  }

  const profile = buildProfileText(userId);
  if (profile.length > 0) parts.push(profile);

  const prior = getLatestResult(userId)?.soul_md?.trim();
  if (prior && prior.length > 0) parts.push('# Earlier voice profile draft\n\n' + prior);

  return parts.join('\n\n---\n\n');
}

/** Turn the model's raw response into a clean, deduped list of statements. */
function parseStatements(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const cleaned = line
      .trim()
      .replace(/^[-*•\d.)\s]+/, '') // strip bullets / numbering
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '') // strip surrounding quotes
      .trim();
    if (cleaned.length < MIN_STATEMENT_LEN || cleaned.length > MAX_STATEMENT_LEN) continue;
    if (!/[a-zA-Z]/.test(cleaned)) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= MAX_CARDS) break;
  }
  return out;
}

/**
 * Generate a fresh batch of cards and persist them. Preflights Ollama (throws
 * OllamaUnavailableError if down/model missing). New statements are inserted;
 * UNIQUE(user_id, statement) makes repeats of already-swiped cards a no-op.
 * Returns the user's full deck (existing + new) in stable order.
 */
export async function generateSwipeCards(cfg: Config, userId: number): Promise<SwipeCardRow[]> {
  const ready = await pingOllama({
    host: cfg.ollamaHost,
    model: cfg.ollamaModel,
    apiKey: cfg.ollamaApiKey,
  });
  if (!ready.ok) {
    throw new OllamaUnavailableError(cfg.ollamaHost, { cause: ready.reason });
  }

  const material = buildMaterial(userId);
  const prompt = SWIPE_CARD_PROMPT_HEADER + material;

  const raw = await generate(
    {
      host: cfg.ollamaHost,
      model: cfg.ollamaModel,
      numCtx: cfg.ollamaNumCtx,
      temperature: GEN_TEMPERATURE,
      // Vary the seed per call so a regeneration yields different candidates.
      seed: Math.floor(Math.random() * 2 ** 31),
      apiKey: cfg.ollamaApiKey,
      timeoutMs: cfg.ollamaTimeoutMs,
    },
    prompt,
  );

  const statements = parseStatements(raw);
  if (statements.length > 0) insertSwipeCards(userId, statements);
  return listSwipeCards(userId);
}
