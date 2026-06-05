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
  [[llm-style-imitation-gap]]).
- A spec lets the model apply the voice to *new* content, where there's no
  matching example to copy.
- It's reviewable by a human — the privacy safety net (see
  [[regurgitation-risk]]).

## What goes on the card

Synthesized from observed voice (chat logs) + the questionnaire. Current
sections include observed-voice patterns, values/worldview, recurring
interests, and the questionnaire-conditional sections (Core Motivation & Fears,
Communication Style, Self-Perception vs. Observed Voice). See
[[../../03-integration-plan]] for the section contract.

## What the 2024-2026 literature says

The project's bet is well-supported, with caveats:

- **PROSE** ([[../sources/prose-2025]]) and **POPI** ([[../sources/popi-2026]])
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
  ([[../sources/stable-personas-2026]], [[../sources/spasm-2026]]) — re-inject
  rather than trust persistence.

## Open question

Which card *format* works best, and by how much does it beat raw examples? The
central empirical bet — supported in spirit, not yet measured head-to-head.

## Sources

[[../sources/prose-2025]], [[../sources/popi-2026]],
[[../sources/imitate-style-2025]], [[../sources/arxiv-2509-14543]];
[[../frameworks/llm-persona-techniques]], [[../frameworks/communication-style]].
