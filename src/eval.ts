// Local, deterministic stylometric metrics for the eval harness. No I/O, no
// Ollama, no deps — pure functions over strings so they're reproducible and
// cheap. We score a generated continuation against the real held-out text and
// report a per-metric distance: lower = closer to the real voice. These are a
// RELATIVE A/B signal between prompt/model/temp changes, NOT absolute fidelity
// (automated stylometry only approximates the individual-Turing-test ceiling).

// A small, language-agnostic-ish function-word set (English + Romanian) — these
// high-frequency tokens carry authorial fingerprint independent of topic.
const FUNCTION_WORDS = [
  // English
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'of', 'to', 'in', 'on', 'at', 'for',
  'with', 'as', 'is', 'are', 'was', 'were', 'be', 'i', 'you', 'he', 'she', 'it',
  'we', 'they', 'this', 'that', 'not', 'so', 'do', 'just', 'my', 'me',
  // Romanian
  'și', 'sau', 'dar', 'dacă', 'de', 'la', 'în', 'pe', 'cu', 'ca', 'este', 'sunt',
  'era', 'eu', 'tu', 'el', 'ea', 'noi', 'voi', 'ei', 'acest', 'asta', 'nu', 'mai',
  'să', 'mă', 'îmi', 'un', 'o',
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}']+/u)
    .filter((t) => t.length > 0);
}

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;
}

function variance(xs: number[]): number {
  if (xs.length === 0) return 0;
  const m = mean(xs);
  return mean(xs.map((x) => (x - m) ** 2));
}

/** Burstiness: coefficient of variation of word lengths (std / mean). Captures
 *  the rhythm of short-vs-long words; AI text tends to be smoother (lower). */
export function burstiness(text: string): number {
  const lens = tokenize(text).map((t) => t.length);
  if (lens.length === 0) return 0;
  const m = mean(lens);
  if (m === 0) return 0;
  return Math.sqrt(variance(lens)) / m;
}

/** Variance of sentence lengths (in words). Humans vary sentence length more. */
export function sentenceLengthVariance(text: string): number {
  const lens = splitSentences(text).map((s) => tokenize(s).length);
  return variance(lens);
}

/** Type-token ratio: unique words / total words. Lexical diversity. */
export function typeTokenRatio(text: string): number {
  const toks = tokenize(text);
  if (toks.length === 0) return 0;
  return new Set(toks).size / toks.length;
}

function functionWordFreqs(text: string): Map<string, number> {
  const toks = tokenize(text);
  const total = toks.length || 1;
  const counts = new Map<string, number>();
  for (const w of FUNCTION_WORDS) counts.set(w, 0);
  for (const t of toks) {
    if (counts.has(t)) counts.set(t, counts.get(t)! + 1);
  }
  const freqs = new Map<string, number>();
  for (const [w, c] of counts) freqs.set(w, c / total);
  return freqs;
}

/** L1 distance between the two texts' function-word frequency profiles. */
export function functionWordDistance(a: string, b: string): number {
  const fa = functionWordFreqs(a);
  const fb = functionWordFreqs(b);
  let d = 0;
  for (const w of FUNCTION_WORDS) d += Math.abs((fa.get(w) ?? 0) - (fb.get(w) ?? 0));
  return d;
}

function charDist(text: string): Map<string, number> {
  const chars = text.toLowerCase().replace(/\s+/g, '');
  const total = chars.length || 1;
  const counts = new Map<string, number>();
  for (const ch of chars) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  const freqs = new Map<string, number>();
  for (const [ch, c] of counts) freqs.set(ch, c / total);
  return freqs;
}

/** L1 distance between character-frequency distributions (diacritics, punctuation
 *  habits, casing all leave a fingerprint here). */
export function charDistributionDistance(a: string, b: string): number {
  const fa = charDist(a);
  const fb = charDist(b);
  const keys = new Set([...fa.keys(), ...fb.keys()]);
  let d = 0;
  for (const k of keys) d += Math.abs((fa.get(k) ?? 0) - (fb.get(k) ?? 0));
  return d;
}

export interface MetricBundle {
  // Distances vs the real text (lower = closer). These are the comparison signal.
  burstinessDelta: number;
  sentenceLengthVarianceDelta: number;
  typeTokenRatioDelta: number;
  functionWordDistance: number;
  charDistributionDistance: number;
}

/** Score a generated continuation against the real held-out continuation.
 *  The three single-value metrics become absolute deltas; the two distribution
 *  metrics are already distances. All are "lower is better". */
export function scoreAgainst(real: string, generated: string): MetricBundle {
  return {
    burstinessDelta: Math.abs(burstiness(real) - burstiness(generated)),
    sentenceLengthVarianceDelta: Math.abs(
      sentenceLengthVariance(real) - sentenceLengthVariance(generated),
    ),
    typeTokenRatioDelta: Math.abs(typeTokenRatio(real) - typeTokenRatio(generated)),
    functionWordDistance: functionWordDistance(real, generated),
    charDistributionDistance: charDistributionDistance(real, generated),
  };
}

/** Average a set of metric bundles field-by-field (for per-condition aggregates). */
export function averageBundles(bundles: MetricBundle[]): MetricBundle {
  const keys: (keyof MetricBundle)[] = [
    'burstinessDelta',
    'sentenceLengthVarianceDelta',
    'typeTokenRatioDelta',
    'functionWordDistance',
    'charDistributionDistance',
  ];
  const out = {} as MetricBundle;
  for (const k of keys) out[k] = mean(bundles.map((b) => b[k]));
  return out;
}
