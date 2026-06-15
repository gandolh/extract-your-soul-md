---
type: source
status: kept
tags: [llm, style-spec, personalization, icml]
year: 2025
updated: 2026-06-05
---

# PROSE (2025) — Aligning LLMs by Predicting Preferences from Writing Samples

**Link**: https://arxiv.org/abs/2505.23815 (ICML 2025)

## Takeaways

- Infers an explicit, human-readable preference description by iteratively
  refining over multiple writing samples and verifying across them.
- +33% writing quality over prior SOTA (CIPHER); +9% more combined with
  few-shot examples (ICL).
- The closest published analogue to a machine-generated `my-soul.md`: a
  natural-language style spec derived from samples, conditionable at inference.

## Touches

[style-card artifact](../concepts/style-card-artifact.md) (primary),
[LLM Persona Techniques](../frameworks/llm-persona-techniques.md).
