---
type: concept
status: open-question
tags: [llm, style-transfer, voice, imitation]
updated: 2026-06-05
---

# The LLM style-imitation gap

LLMs are good at imitating *explicit, nameable* style features (formality,
sentence length, emoji use) and noticeably worse at *implicit* ones — the
function-word habits and rhythmic fingerprints that [[../frameworks/liwc]]
identifies as the truest personality signal (arxiv 2509.14543).

## The design implication

This is *why* `my-soul.md` exists as a structured artifact rather than "here are
20 example messages, imitate them." If the model can't reliably pick up implicit
features from raw examples, the next best thing is to **make the implicit
explicit** — name the function-word habits, the redemption/contamination arc,
the rapport/report tilt, so the model has them as instructions, not just as
patterns to infer. See [[style-card-artifact]].

## Corroborating 2024-2026 work

- LLMs mimic linguistic *style* better than narrative *structure*
  ([[../sources/cognitive-simulation-2025]]) — they nail surface patterns,
  fail at plot/cognitive construction.
- Fine-tuning on facts gives surface imitation but misses deeper voice;
  "holistic representation goes beyond surface-level facts" (CharacterBot,
  [[../sources/characterbot-2025]]).
- Even style-matched output is statistically *more predictable* than human
  text (perplexity 15.2 vs 29.5, [[../sources/imitate-style-2025]]) — the gap
  has a measurable signature, which is itself an [[ai-tells|AI tell]].

## Open questions (for ingest/lint)

- How much does naming an implicit feature actually close the gap?
- Which features are worth naming vs. better left to examples?

## Sources

[[../sources/arxiv-2509-14543]], [[../sources/cognitive-simulation-2025]],
[[../sources/characterbot-2025]], [[../sources/imitate-style-2025]];
[[../frameworks/llm-persona-techniques]].
