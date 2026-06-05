---
type: framework
status: borrowed
tags: [big-five, ocean, ffm, traits, liwc]
updated: 2026-06-05
---

# Big Five (FFM / OCEAN)

**Verdict: *borrowed*** — we use its *linguistic correlates* to guide what the
extractor looks for, but we never administer or score a Big Five instrument.

## What it is

The dominant trait taxonomy in academic psychology: Openness,
Conscientiousness, Extraversion, Agreeableness, Neuroticism. Facets in NEO-PI-R
(30) and BFI-2 (15). Validated short forms: BFI-2 (60 items), BFI-2-S/XS
(30/15), TIPI (10), public-domain IPIP-NEO.

## Why it matters here — linguistic correlates

From Yarkoni 2010, Pennebaker, Mairesse et al. — these are what the extractor
actually keys on (see [[liwc]]):

- **Openness** — longer words, intellectual vocabulary, articles/prepositions
  (analytic structure). *Strongest* linguistic predictor.
- **Extraversion** — social words, positive emotion, higher word count.
- **Neuroticism** — first-person singular ("I"), negative-emotion words.
- **Agreeableness** — first-person plural ("we"), positive emotion, less anger.
- **Conscientiousness** — weakest linguistic signal of the five.

## Why we don't score it

The Koutsoumpis 2023 meta-analysis (n=85,724): self-report Big Five ↔ LIWC is
only |ρ| = .08–.14 (~5% variance), while observer-report from text is
.18–.39 (~38%). For voice imitation, the self-report instrument is low-ROI.
See [[../concepts/self-report-vs-observer-gap]] and
[[../concepts/dual-use-signal]].

## Sources

[[../sources/koutsoumpis-2023]], [[../sources/yarkoni-2010]],
and the Big Five cluster in [[../../references]].
