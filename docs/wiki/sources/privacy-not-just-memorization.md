---
type: source
status: kept
tags: [privacy, memorization, inference]
year: 2025
updated: 2026-06-05
---

# Privacy Is Not Just Memorization (2025) + Verbatim Memorization (NeurIPS 2025)

**Links**:
- Position paper: https://arxiv.org/abs/2510.01645
- Verbatim memorization: https://openreview.net/forum?id=Xuvdo6oMkE (NeurIPS
  2025)

## Takeaways

- 92% of privacy research targets training-data memorization; the most pressing
  harms (inference-time leakage, agent-enabled aggregation) get ~8%.
- Counterintuitive: better verbatim memorization does *not* necessarily mean
  more leakage — what matters more is the model's *understanding* capability,
  which exposes personal info through conversational inference.

## Why it matters

Preventing exact-text memorization does **not** remove the privacy risk of a
rich voice profile: a capable model can leak by inference. Reinforces the
review-gated, gitignored design and the "patterns not quotes" extraction rule.

## Touches

[[../concepts/regurgitation-risk]] (primary).
