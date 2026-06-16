// Synthesis-time verbatim-overlap guard. The map/reduce prompts ask the model to
// capture *patterns, not quotes* and to keep only SHORT signature tokens verbatim
// — but that's a soft instruction a small model can ignore, leaking a private
// sentence word-for-word into soul.md. This is the post-generation check.
//
// We flag any run of N consecutive words (default 7) that appears verbatim in BOTH
// the generated profile and the source text. 7 is deliberately long: a 7-word run
// is almost never a deliberate catchphrase (those are 1-3 words, which the prompt
// preserves on purpose) — it's a leaked sentence fragment. Language-agnostic
// (works for RO / code-switch), deterministic, no dependency.
//
// Per the research ([regurgitation-risk], [privacy-not-just-memorization]),
// verbatim prevention is necessary-but-not-sufficient — style alone re-identifies.
// So this LOGS + WARNS for the manual-review gate; it does not silently strip
// (stripping risks mangling the profile mid-sentence and is not the real safety
// net — gitignore + human review is).

/** Default shingle length, in words. Long enough that catchphrases (1-3 words,
 *  intentionally preserved) don't trip it; short enough to catch a leaked clause. */
export const DEFAULT_NGRAM = 7;

/** Tokenize for overlap comparison: lowercase, drop punctuation, split on
 *  whitespace. Punctuation-insensitive so "hey, what's up" and "hey what s up"
 *  shingle the same — we're matching leaked *content*, not exact typography. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/** All n-word shingles of a token list, joined by single spaces. */
function shingles(tokens: string[], n: number): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + n <= tokens.length; i++) {
    out.add(tokens.slice(i, i + n).join(' '));
  }
  return out;
}

export interface OverlapHit {
  /** The leaked shingle, normalized (lowercase, no punctuation). */
  shingle: string;
}

export interface OverlapReport {
  ngram: number;
  /** Distinct leaked shingles found in both source and generated text. */
  hits: OverlapHit[];
}

/**
 * Find n-gram shingles that appear verbatim in BOTH `generated` and `source`.
 * Returns distinct overlapping shingles (the leaked spans). Pure + deterministic.
 */
export function findVerbatimOverlap(
  generated: string,
  source: string,
  ngram: number = DEFAULT_NGRAM,
): OverlapReport {
  const genShingles = shingles(tokenize(generated), ngram);
  if (genShingles.size === 0) return { ngram, hits: [] };
  const srcShingles = shingles(tokenize(source), ngram);
  const hits: OverlapHit[] = [];
  for (const sh of genShingles) {
    if (srcShingles.has(sh)) hits.push({ shingle: sh });
  }
  return { ngram, hits };
}
