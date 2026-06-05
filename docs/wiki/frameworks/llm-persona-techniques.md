---
type: framework
status: kept
tags: [llm, persona, style-transfer, personalization, 2024-2026]
updated: 2026-06-05
---

# LLM persona / style-imitation techniques (2024-2026)

**Verdict: *kept*** — this is the prior art for what `my-soul.md` *is*. The
2024-2026 literature converges on the project's bet, with important nuances.

## What the recent work says

- **Natural-language style specs beat raw history.** PROSE
  ([[../sources/prose-2025]]) infers a human-readable preference description by
  refining over writing samples and verifying across them — +33% writing
  quality over prior SOTA, +9% more when combined with few-shot examples. POPI
  ([[../sources/popi-2026]]) shows such a summary is **generator-transferable**:
  inferred once, reused across frozen/black-box models, and it dodges "context
  rot" from dumping verbose history into the prompt. These are the closest
  existing analogues to a machine-generated `my-soul.md`. See
  [[../concepts/style-card-artifact]].
- **Style is easier than substance.** Models mimic surface linguistic style
  well but fail at deeper cognitive/narrative structure
  ([[../sources/cognitive-simulation-2025]], CharacterBot
  [[../sources/characterbot-2025]]). Reinforces
  [[../concepts/llm-style-imitation-gap]].
- **Few-shot >> zero-shot, prompting > model size.** Up to 23.5× style-match
  improvement from few-shot vs. zero-shot
  ([[../sources/imitate-style-2025]]). But matched outputs are *more
  predictable* than humans (perplexity 15.2 vs 29.5) — a detectable tell, see
  [[../concepts/ai-tells]].
- **Persona drift is real and architectural.** Self-reported persona stays
  stable across sessions, but *observer-rated* expression degrades over long
  conversations, consistently across models ([[../sources/stable-personas-2026]],
  CHI 2026). SPASM ([[../sources/spasm-2026]], ACL 2026) names the failure
  modes — drift, role confusion, "echoing" — and mitigates them without
  weight changes. Directly relevant to the project's "consistent across
  sessions" goal: a static profile helps stability, but long-context drift is a
  separate problem.

## Design implications

1. `my-soul.md` as a portable, model-agnostic natural-language spec is the
   right shape (PROSE/POPI).
2. Pair the spec with a few representative samples — the two compound.
3. For long generations, expect drift; re-inject the profile rather than
   relying on it surviving a long context.

## Sources

[[../sources/prose-2025]], [[../sources/popi-2026]],
[[../sources/imitate-style-2025]], [[../sources/cognitive-simulation-2025]],
[[../sources/characterbot-2025]], [[../sources/stable-personas-2026]],
[[../sources/spasm-2026]], and the persona-techniques cluster in
[[../../references]].
