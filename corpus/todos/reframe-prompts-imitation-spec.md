# Reframe map/reduce prompts from personality report to imitation spec

**Priority:** P1 · **Goal:** accuracy · **Impact:** high · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
`MAP_PROMPT_HEADER` opens "extract observations about VOICE and PERSONALITY"
([prompts.ts:2](../../src/prompts.ts#L2)) and the QA header leans into
beliefs/values/motivation/fear/narrative
([prompts.ts:31-42](../../src/prompts.ts#L31-L42)) — abstractions a downstream
LLM can't mechanically imitate. The blunt `do NOT quote verbatim — paraphrase`
([prompts.ts:16,46,106](../../src/prompts.ts#L16)) conflates the privacy goal
with the lexical goal: a person's actual greetings, fillers, catchphrases and
interjections ARE the voice, and "uses casual greetings" destroys imitability.
The corpus says exactly this — make the implicit explicit, name function-word
habits ([llm-style-imitation-gap](../wiki/concepts/llm-style-imitation-gap.md));
the artifact is a style card, not a personality report
([style-card-artifact](../wiki/concepts/style-card-artifact.md)).

## Decision / approach (grilled 2026-06-16 — "permit short non-private tokens only")
- Change [prompts.ts:2](../../src/prompts.ts#L2) to a **voice-first** framing; add
  explicit asks for: function-word habits (pronoun/article density, lowercase-i),
  typical message length in words, capitalization quirks, emoji-per-message rate +
  which emojis, signature openers/closers/interjections, code-switch triggers.
- **Narrow the verbatim ban** (not lift it): ban whole private sentences + named
  facts/entities, but PERMIT preserving short high-frequency non-private
  stylistic tokens verbatim (greetings, sign-offs, fillers, catchphrases).
- Capture punctuation habits as facts but **flag the em-dash as an AI tell**
  ([ai-tells](../wiki/concepts/ai-tells.md)) — do NOT instruct the imitator to
  lean into it.
- Demote the QA abstract-personality block to a smaller secondary section so it
  stops crowding out the voice-feature extraction the QA prose affords
  ([dual-use-signal](../wiki/concepts/dual-use-signal.md)).
- **Mirror every edit** into the Claude path: `.claude/agents/soul-chunk-extractor.md`
  and the reduce structure in `.claude/skills/extract-soul/SKILL.md` (the bullet
  shape is duplicated — easier once
  [single-source-reduce-template](single-source-reduce-template.md) lands).
- Few-shot "Representative Samples" stays **deferred** —
  [representative-samples-fewshot](representative-samples-fewshot.md).

## First step
Edit [prompts.ts:2](../../src/prompts.ts#L2) to voice-first framing + add the
mechanical-feature bullets; narrow the line-16 verbatim rule.

## Dependencies & sequencing
After [cache-fingerprint](cache-fingerprint-prompt-model-ctx.md)
(else the edit appears to do nothing on re-runs). Measure with
[style-card-eval-harness](style-card-eval-harness.md).

## Refs
code: [prompts.ts](../../src/prompts.ts), `.claude/agents/soul-chunk-extractor.md`, `.claude/skills/extract-soul/SKILL.md` · corpus: [llm-style-imitation-gap](../wiki/concepts/llm-style-imitation-gap.md), [style-card-artifact](../wiki/concepts/style-card-artifact.md), [ai-tells](../wiki/concepts/ai-tells.md)
