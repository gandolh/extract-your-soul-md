---
type: concept
status: open-question
tags: [ai-tells, anti-patterns, humanization, ai-patterns]
updated: 2026-06-05
---

# AI tells (anti-patterns)

The flip side of imitating a human voice: removing the patterns that make text
read as *AI-generated*. The sibling `add-soul` skill pairs `my-soul.md` (the
voice to add) with an `ai-patterns.md` (the tells to strip).

## Known tells (seed list — to be expanded from sources)

- Em-dash overuse and the "it's not just X, it's Y" antithesis construction.
- Inflated diction: "delve", "tapestry", "testament to", "navigate the
  landscape", "in today's fast-paced world".
- Hedged, list-of-three rhythm; relentless balance ("on one hand… on the
  other").
- Empty summarizing conclusions ("In conclusion, …").
- Over-explained transitions and signposting.

## Why it's a wiki concept

Removing tells and adding voice are two halves of the same goal (text that
reads as *this specific human*). A good `ai-patterns.md` needs sourced,
maintained material — this page tracks the source list and rationale so the
catalogue doesn't drift into folklore.

## Sourced catalogue (2024-2026)

- **Wikipedia: Signs of AI Writing** ([[../sources/wikipedia-signs-of-ai-writing]])
  — the most comprehensive maintained catalogue: AI vocabulary, rule-of-three,
  "not X but Y", copula avoidance ("serves as" for "is"), tailing participle
  clauses, markdown bleeding into prose.
- **The Last Fingerprint** ([[../sources/last-fingerprint-emdash-2026]]) — the
  em dash is markdown leaking into prose; it persists *even under explicit
  suppression*, so it's a robust tell, not a preference.
- **avoid-ai-writing skill** ([[../sources/avoid-ai-writing-skill]]) — 50 named
  detectors + a 109-entry vocabulary replacement table; directly adaptable as
  `ai-patterns.md` source material.
- **Statistical tell**: AI text is systematically *less variable* (lower
  perplexity) than human text even when surface style matches
  ([[../sources/imitate-style-2025]]) — a tell no word-list captures.

## Open questions (for ingest)

- Which "tells" are real signals vs. stylistic superstition?
- Do tells differ by model family and by year? (Yes — "delve" peaked 2023-2024
  and dropped in 2025; the catalogue is a moving target.)

## Sources

[[../sources/wikipedia-signs-of-ai-writing]],
[[../sources/last-fingerprint-emdash-2026]],
[[../sources/avoid-ai-writing-skill]], [[../sources/imitate-style-2025]].
Related: [[style-card-artifact]], [[llm-style-imitation-gap]].
