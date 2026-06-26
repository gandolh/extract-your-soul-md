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

// Each generation nudges the model toward a different facet so regenerations
// surface genuinely new cards rather than rephrasing the same few. One is
// chosen at random per call (alongside the random seed + shuffled material).
const FOCI = [
  'their writing voice and sentence-level style',
  'their humor and how playful or dry they are',
  'their beliefs, values, and what they argue about',
  'their core motivations and what they fear being seen as',
  'self-perception gaps — how they think they come across vs. how they do',
  'habits, temperament, and day-to-day preferences',
  'statements you are LESS sure about — plausible but unconfirmed, so the yes/no is informative',
];

/** Fisher–Yates shuffle (returns a new array). Server-side randomness is fine
 *  here — variety across regenerations is the whole point. */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
    // Shuffle the answer order each call so a regeneration weights different
    // material first — input variety on top of the seed + temperature.
    parts.push('# Questionnaire answers\n\n' + shuffled(answerBlocks).join('\n\n'));
  }

  const profile = buildProfileText(userId);
  if (profile.length > 0) parts.push(profile);

  const prior = getLatestResult(userId)?.soul_md?.trim();
  if (prior && prior.length > 0) parts.push('# Earlier voice profile draft\n\n' + prior);

  return parts.join('\n\n---\n\n');
}

/** Turn the model's raw response into a clean, deduped list of statements.
 *  Exported for unit testing. */
export function parseStatements(raw: string): string[] {
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
  // A random focus this batch, so regenerations explore different facets rather
  // than rephrasing the same handful of statements.
  const focus = FOCI[Math.floor(Math.random() * FOCI.length)];
  const prompt =
    SWIPE_CARD_PROMPT_HEADER +
    `For THIS batch, lean toward (but don't limit yourself to) ${focus}.\n\n` +
    material;

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
