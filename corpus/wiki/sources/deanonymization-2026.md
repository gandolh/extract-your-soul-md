---
type: source
status: kept
tags: [privacy, de-anonymization, inference, icml]
year: 2026
updated: 2026-06-05
---

# From Weak Cues to Real Identities (2026) — Inference-Driven De-Anonymization

**Link**: https://arxiv.org/abs/2603.18382 (ICML 2026)

## Takeaways

- LLM agents combining non-identifying writing cues with public info
  reconstruct **79.2%** of identities (vs 56.0% classical), even in sparse-data
  settings — without explicit re-identification requests.
- Privacy evaluation must measure *inferable* identity, not just *disclosed*
  information.

## Why it matters

The most direct threat model for publishing a rich voice profile built from
personal writing: even style-only cues are re-identifying. Strengthens the
case for keeping `out/` private and review-gated.

## Touches

[regurgitation risk](../concepts/regurgitation-risk.md) (primary).
