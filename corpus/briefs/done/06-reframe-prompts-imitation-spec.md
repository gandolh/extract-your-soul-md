# Brief 06 — Reframe map/reduce prompts from personality report to imitation spec

**Promoted from:** [todos/reframe-prompts-imitation-spec.md](../../todos/reframe-prompts-imitation-spec.md)
**Priority:** P1 · **Goal:** accuracy · **Impact:** high · **Effort:** S · **Captured:** 2026-06-16 · **Promoted:** 2026-06-16 · **Done:** 2026-06-16

## Why
The prompts framed extraction as a *personality report* (abstractions a
downstream LLM can't mechanically imitate) and a blunt "do NOT quote verbatim"
rule that destroyed the imitable core of the voice (greetings, fillers,
catchphrases). The corpus says the artifact is a **style card, not a personality
report** ([style-card-artifact](../../wiki/concepts/style-card-artifact.md)) and
that the implicit voice features must be made explicit
([llm-style-imitation-gap](../../wiki/concepts/llm-style-imitation-gap.md)).
First prompt-fidelity change since the eval harness (brief 05) — measurable now.

## Scope (the change) — all in [prompts.ts](../../../src/prompts.ts)
1. **MAP_PROMPT_HEADER:** voice-first/imitation framing; added explicit asks for
   function-word habits, message length in words, capitalization quirks, emoji
   rate + which emoji, signature openers/closers/interjections/catchphrases,
   code-switch triggers; flag the em-dash as an AI tell (record, don't lean in).
2. **Narrowed the verbatim ban** (didn't lift it): ban whole private sentences +
   named facts/entities, but PERMIT preserving short high-frequency non-private
   stylistic tokens verbatim. Applied consistently to both map headers + reduce.
3. **MAP_PROMPT_HEADER_QA:** demoted the abstract-personality block to a SECONDARY
   set; voice features from the prose lead. Same verbatim narrowing.
4. **REDUCE_PROMPT_HEADER:** Vocabulary section keeps signature tokens verbatim;
   Stylistic Habits adds function-word/length/capitalization + em-dash caution;
   reconcile rules carry the narrowed privacy-vs-voice rule.

## Out of scope (locked)
- Few-shot "Representative Samples" stays deferred
  ([representative-samples-fewshot](../../todos/representative-samples-fewshot.md)).

## Outcome (2026-06-16)
Implemented as specced. **Header growth side-effect handled:** the reframe grew
the headers (MAP 217→457, MAP_QA 377→565, REDUCE 575→741 tok). Brief 02's
`HEADER_RESERVE=600` (sized for the old MAP_QA≈377) no longer left enough room
for the per-chunk file header + separators on top of the new 565-tok MAP_QA, so
bumped `HEADER_RESERVE` 600→768 in [chunk.ts](../../../src/stages/chunk.ts) and
fixed its now-stale comment. Net: chunk budget 7080→6912 at 8192 ctx (−168), with
715 tokens of headroom under num_ctx in the worst case. The brief-01 cache
fingerprint (hashes the live header) means this prompt edit correctly invalidates
all cached bullets on the next run. `npm run build` clean.

**Not yet measured:** the whole point is to run the brief-05 eval (A/B/C) before
vs. after on real data with a live Ollama to confirm the reframe improves the
A-condition. That requires a populated user + Ollama, so it's left as the
immediate next validation step, not done here.

## Refs
code: [prompts.ts](../../../src/prompts.ts), [chunk.ts](../../../src/stages/chunk.ts) · corpus: [llm-style-imitation-gap](../../wiki/concepts/llm-style-imitation-gap.md), [style-card-artifact](../../wiki/concepts/style-card-artifact.md), [ai-tells](../../wiki/concepts/ai-tells.md) · measure with [briefs/done/05](05-style-card-eval-harness.md)
