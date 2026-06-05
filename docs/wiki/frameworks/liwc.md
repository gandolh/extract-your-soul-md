---
type: framework
status: kept
tags: [liwc, pronouns, function-words, voice]
updated: 2026-06-05
---

# LIWC & function-word analysis

**Verdict: *kept*** — function-word signal directly shapes what the extractor
pulls from text.

## Core idea (Pennebaker, Boyd, Mehl)

**Function words** (pronouns, articles, prepositions) are better personality
signals than content words, because they are deployed automatically, below
conscious control — so they're hard to fake and they fingerprint a voice.

- First-person singular ("I") rises with self-focused attention, low status,
  and depression — *not* narcissism (a common misreading).
- Pronoun ratios, article density, and preposition use map onto the
  [[big-five]] correlates.

## How it's used here

The extractor treats observable function-word patterns as primary voice
evidence — these are exactly the implicit features LLMs struggle to reproduce
(see [[../concepts/llm-style-imitation-gap]]), which is why naming them
explicitly in `my-soul.md` matters.

## Sources

LIWC / Pennebaker cluster in [[../../references]];
[[../sources/yarkoni-2010]].
