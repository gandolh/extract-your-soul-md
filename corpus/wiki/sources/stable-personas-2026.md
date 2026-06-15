---
type: source
status: kept
tags: [llm, persona-drift, consistency, chi]
year: 2026
updated: 2026-06-05
---

# Stable Personas (2026) — Temporal Stability in LLM Human Simulation

**Link**: https://arxiv.org/abs/2601.22812 (CHI 2026)

## Takeaways

- Persona-instructed LLMs keep *self-reported* persona traits stable across
  sessions, but *observer-rated* persona expression degrades during extended
  conversations — a "regression tendency."
- The drift is consistent across seven models and four persona conditions →
  architectural, not model-specific.

## Implication for this project

The project's goal is consistency "across sessions." A static profile helps the
self-reported axis, but long-context drift is a separate failure — re-inject
the profile periodically rather than trusting it to persist.

## Touches

[LLM Persona Techniques](../frameworks/llm-persona-techniques.md) (primary),
[style-card artifact](../concepts/style-card-artifact.md).
