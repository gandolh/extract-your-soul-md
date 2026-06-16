# 29 — Representative Samples section (short verbatim tokens only)

**Priority:** P3 (gated) · **Goal:** accuracy · **Impact:** medium · **Effort:** M · **Status:** done · **Promoted:** 2026-06-16 (from `todos/representative-samples-fewshot.md`) · **Done:** 2026-06-16

## Outcome (2026-06-16)
Shipped the **conservative half** of the deferred few-shot work — short verbatim
signature tokens, NOT prose-sentence excerpts (the high re-ID surface stays
unshipped). One change, in [prompts.ts](../../../src/prompts.ts):

Added a `## Representative Samples` section to `buildReducePrompt` (placed right
after How To Imitate, before Drift Anchor — so a consumer reading the imitation
spec immediately sees the concrete anchors the literature says PROSE needs). The
section instructs the model to emit 3-6 of the person's OWN short signature
tokens (greetings, sign-offs, interjections, fillers, catchphrases) quoted
verbatim, under three STRICT rules:
- ONLY reuse short verbatim tokens already surfaced in the batches — do NOT
  compose, paraphrase, or invent excerpts (a fabricated sample teaches generic
  AI cadence as if it were the person's — the core risk the grill flagged).
- Each entry is a short token/fragment, never a whole sentence, and must carry
  NO names/places/employers/identifying specifics.
- If the batches lack enough non-private verbatim tokens, emit fewer or omit the
  section. Never pad.

The section lives in the shared body of `buildReducePrompt`, so it appears for
both chat-only and questionnaire corpora. The material it draws on already
exists — both map prompts (post brief 06) preserve "short, high-frequency,
non-private stylistic tokens verbatim." Both typechecks + `build:server` clean.
Nothing committed.

### Interaction with the n-gram guard (verified, no code change)
The section deliberately quotes short verbatim tokens — which by design appear
in the source. `DEFAULT_NGRAM = 7` ([regurgitation.ts:20](../../../src/regurgitation.ts#L20)),
so the guard only flags verbatim runs of **7+ words**. The few-words tokens this
section emits sit well under that, so intentional tokens don't trip false
regurgitation warnings, yet a model that ignores the "short fragment" constraint
and emits a long run is still caught. The two features compose cleanly.

## Gate status at ship time
Both hard gates from the todo are satisfied:
- **n-gram verbatim-overlap guard** — done (brief 15).
- **eval harness can measure the +9% claim** — done (brief 05); `src/eval.ts`
  gives a relative A/B stylometric signal (burstiness / sentence-length variance
  / TTR / function-word / char-distribution distances) between prompt conditions.
- map emits verbatim style-tokens — done (brief 06, reframe-prompts).

## Scope decision (user, 2026-06-16): short tokens only
The todo offered three paths; the user chose **short verbatim tokens only** over
full cross-register sentence excerpts. Rationale: excerpts are "the single
highest re-identification surface" ([deanonymization-2026](../../wiki/sources/deanonymization-2026.md):
79.2% style-only re-id), and the n-gram guard currently only **warns** (doesn't
filter), so prose excerpts would need active filtering before they're safe. The
+9% prose-with-few-shot figure ([prose-2025](../../wiki/sources/prose-2025.md))
remains **inferred, not measured** — a future eval-harness A/B (this section
on/off) should quantify whether even the token-level version moves fidelity
metrics before escalating to full excerpts.

## Deferred (still open as a follow-up, not re-filed yet)
- Full `## Representative Samples` with 3-6 entity-stripped cross-register
  sentence exemplars — revisit only with (a) an active n-gram **filter** (not
  just a warning) and (b) eval data showing the token version under-delivers.

## Problem
soul.md shipped as pure prose with zero representative voice excerpts; How To
Imitate told a model how to write but gave nothing concrete to anchor on.

## Refs
code: [prompts.ts](../../../src/prompts.ts), [regurgitation.ts](../../../src/regurgitation.ts), [eval.ts](../../../src/eval.ts) · corpus: [prose-2025](../../wiki/sources/prose-2025.md), [style-card-artifact](../../wiki/concepts/style-card-artifact.md), [regurgitation-risk](../../wiki/concepts/regurgitation-risk.md), [deanonymization-2026](../../wiki/sources/deanonymization-2026.md)
