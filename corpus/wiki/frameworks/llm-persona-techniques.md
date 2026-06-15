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
  ([PROSE 2025](../sources/prose-2025.md)) infers a human-readable preference description by
  refining over writing samples and verifying across them — +33% writing
  quality over prior SOTA, +9% more when combined with few-shot examples. POPI
  ([POPI 2026](../sources/popi-2026.md)) shows such a summary is **generator-transferable**:
  inferred once, reused across frozen/black-box models, and it dodges "context
  rot" from dumping verbose history into the prompt. These are the closest
  existing analogues to a machine-generated `my-soul.md`. See
  [style-card artifact](../concepts/style-card-artifact.md).
- **Style is easier than substance.** Models mimic surface linguistic style
  well but fail at deeper cognitive/narrative structure
  ([Cognitive Simulation 2025](../sources/cognitive-simulation-2025.md), CharacterBot
  [CharacterBot 2025](../sources/characterbot-2025.md)). Reinforces
  [LLM style-imitation gap](../concepts/llm-style-imitation-gap.md).
- **Few-shot >> zero-shot, prompting > model size.** Up to 23.5× style-match
  improvement from few-shot vs. zero-shot
  ([Imitate Style 2025](../sources/imitate-style-2025.md)). But matched outputs are *more
  predictable* than humans (perplexity 15.2 vs 29.5) — a detectable tell, see
  [AI tells](../concepts/ai-tells.md).
- **Persona drift is real and architectural.** Self-reported persona stays
  stable across sessions, but *observer-rated* expression degrades over long
  conversations, consistently across models ([Stable Personas 2026](../sources/stable-personas-2026.md),
  CHI 2026). SPASM ([SPASM 2026](../sources/spasm-2026.md), ACL 2026) names the failure
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

[PROSE 2025](../sources/prose-2025.md), [POPI 2026](../sources/popi-2026.md),
[Imitate Style 2025](../sources/imitate-style-2025.md), [Cognitive Simulation 2025](../sources/cognitive-simulation-2025.md),
[CharacterBot 2025](../sources/characterbot-2025.md), [Stable Personas 2026](../sources/stable-personas-2026.md),
[SPASM 2026](../sources/spasm-2026.md), and the persona-techniques cluster in
[references](../sources-raw/references.md).
