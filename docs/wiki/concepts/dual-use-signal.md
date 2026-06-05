---
type: concept
status: kept
tags: [voice, methodology, questionnaire]
updated: 2026-06-05
---

# Dual-use signal

The design principle that holds the whole questionnaire together: **every
open-ended answer is used twice at once.**

1. As **propositional content** — what the person believes, fears, values,
   finds funny, is passionate about. (What chat logs can't see.)
2. As a **voice sample** — the actual sentences, in the person's own hand, in
   the register the question evokes.

A Likert item gives you only (1), and weakly (see
[[self-report-vs-observer-gap]]). A free-text answer gives you both, which is
why the question set is short and entirely open-ended — every Likert item would
be "wasted budget" by comparison.

This is also why question *ordering* matters: frustration first (loosens the
keyboard, natural venting register), vulnerable/meta questions later. The goal
is to capture writing the person didn't compose for self-presentation.

## Consequences for design

- No scoring of any framework — see [[../overview]].
- Frameworks contribute *prompts*, not *typologies*:
  [[../frameworks/enneagram]], [[../frameworks/mcadams-narrative-identity]],
  [[../frameworks/communication-style]].
- The answers feed the same chunk → extract pipeline as chat logs.

## Confirmed by 2024-2026 work

A Nature Human Behaviour 2025 study ([[../sources/genai-openended-scoring-2025]])
had LLMs score Big Five from brief open-ended narratives and found convergence
with self-report at rs = 0.30-0.53 — **comparable to or exceeding** established
benchmarks, and **outperforming LIWC dictionary methods**. The 2024-2026 sweep
found no contradicting evidence. A design *nuance* from
[[../sources/life-narratives-prompts-2025]]: targeted event-specific prompts
isolate trait facets better than purely reflective ones — supports keeping (and
maybe adding to) the narrative-identity question.

## Sources

[[../sources/frontiers-2022]], [[../sources/koutsoumpis-2023]],
[[../sources/genai-openended-scoring-2025]],
[[../sources/life-narratives-prompts-2025]].
