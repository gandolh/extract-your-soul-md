---
type: concept
status: open-question
tags: [llm, voice, prompt-design, my-soul]
updated: 2026-06-05
---

# The style-card artifact

`my-soul.md` is best understood not as a *personality report* but as a **style
card**: a compact, structured spec of a person's voice that an LLM reads as
instructions before generating text in that voice.

## Why a structured spec, not raw examples

- LLMs miss implicit style from examples alone (see
  [LLM style-imitation gap](llm-style-imitation-gap.md)).
- A spec lets the model apply the voice to *new* content, where there's no
  matching example to copy.
- It's reviewable by a human — the privacy safety net (see
  [regurgitation risk](regurgitation-risk.md)).

## What goes on the card

Synthesized from observed voice (chat logs) + the questionnaire. Current
sections include observed-voice patterns, values/worldview, recurring
interests, and the questionnaire-conditional sections (Core Motivation & Fears,
Communication Style, Self-Perception vs. Observed Voice). See
[Integration Plan](../sources-raw/03-integration-plan.md) for the section contract.

## What the 2024-2026 literature says

The project's bet is well-supported, with caveats:

- **PROSE** ([PROSE 2025](../sources/prose-2025.md)) and **POPI** ([POPI 2026](../sources/popi-2026.md))
  both generate exactly this kind of natural-language style spec from writing
  samples and show large gains; POPI further shows the spec is
  **generator-transferable** across frozen/black-box models and avoids the
  "context rot" of stuffing raw history into the prompt.
- **Best results combine spec + examples** — PROSE gains another +9% when the
  description is paired with few-shot samples. So `my-soul.md` should travel
  *with* a few representative excerpts, not replace them.
- ⚠️ **Still untested directly**: no published controlled comparison of
  "structured spec vs. raw examples" at the prompting level. The exact win is
  inferred, not measured. (Open.)
- **Drift caveat**: even a good spec degrades over long generations
  ([Stable Personas 2026](../sources/stable-personas-2026.md), [SPASM 2026](../sources/spasm-2026.md)) — re-inject
  rather than trust persistence.

## Open question

Which card *format* works best, and by how much does it beat raw examples? The
central empirical bet — supported in spirit, not yet measured head-to-head.

## Sources

[PROSE 2025](../sources/prose-2025.md), [POPI 2026](../sources/popi-2026.md),
[Imitate Style 2025](../sources/imitate-style-2025.md), [arxiv 2509.14543](../sources/arxiv-2509-14543.md);
[LLM Persona Techniques](../frameworks/llm-persona-techniques.md), [Communication Style](../frameworks/communication-style.md).
