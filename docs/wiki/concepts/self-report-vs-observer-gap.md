---
type: concept
status: kept
tags: [voice, methodology, measurement]
updated: 2026-06-05
---

# The self-report vs. observer gap

The single most important number behind this project.

**Self-report** personality scores (you rating yourself on Big Five / MBTI
items) correlate only weakly with your actual linguistic style:
|ρ| = .08–.14, ~5% of variance (Koutsoumpis et al. 2023, n=85,724).

**Observer-report** from text — inferring traits *from the writing itself* —
correlates much more strongly: |ρ| = .18–.39, ~38% of variance.

## Why it matters

A tool that imitates writing voice should lean on the **observer** side: read
the text, infer the voice. Self-report instruments are low-ROI for this
purpose. This is the empirical backbone of [[dual-use-signal]] and the reason
the design [[../frameworks/big-five]] is *borrowed* (for its linguistic
correlates) rather than *scored*.

⚠️ Caveat to revisit during lint: this is about *trait inference*, not about
*voice imitation by an LLM*. Whether a person's own self-description of their
voice (e.g. Q8, the aspiration gap) helps an LLM imitate them is a separate,
open question — tracked in [[style-card-artifact]].

## Sources

[[../sources/koutsoumpis-2023]], [[../sources/yarkoni-2010]].
