---
type: concept
status: open-question
tags: [privacy, safety, memorization, my-soul]
updated: 2026-06-16
---

# Regurgitation & privacy risk

The profile is built from a person's real, private writing (WhatsApp exports,
candid questionnaire answers). Two risks follow:

1. **Verbatim regurgitation** — an LLM given rich personal context may quote it
   back word-for-word, leaking specifics (names, events, secrets) instead of
   only imitating *style*.
2. **Privacy surface** — `inputs/`, `chunks/`, and `out/` all contain private
   data.

## Mitigations in the current design

- **Everything private is gitignored** — `inputs/` (chat logs + questionnaire
  answers), `chunks/`, `.cache/`, `out/` (the profile). Verified; see
  [log](../log.md).
- **`out/my-soul.md` is not auto-copied downstream** — manual eyeball review is
  the deliberate safety net against regurgitation. (Root `CLAUDE.md`,
  "Privacy boundary".)
- The extractor is instructed to capture *patterns*, not *quotes*.
- **Verbatim-overlap guard (brief 15, `src/regurgitation.ts`)** — after the
  reduce, any 7-word run appearing verbatim in both the profile and the private
  source is flagged. It **logs + warns, deliberately does NOT strip** — the
  detection feeds the manual-review gate rather than mangling the profile. n=7 is
  chosen so the intentionally-preserved short signature tokens (1-3 words) don't
  trip it. This turns the soft "patterns not quotes" instruction into actual
  enforcement; in practice it has caught the reduce quoting a full source sentence
  verbatim as a "signature line".

## What the 2024-2026 privacy literature adds

The risk is broader than verbatim quoting:

- **Inference beats memorization.** "Privacy is not just memorization"
  ([Privacy Not Just Memorization](../sources/privacy-not-just-memorization.md)): 92% of privacy research
  targets training-data memorization, but the worse harms are inference-time
  leakage and agent-enabled aggregation. Better verbatim memorization does
  *not* straightforwardly mean more leakage — a capable model leaks by
  inference. So "don't memorize exact text" is **not** a sufficient mitigation.
- **Style alone re-identifies.** De-anonymizing agents reconstruct 79.2% of
  identities from non-identifying writing cues + public info
  ([Deanonymization 2026](../sources/deanonymization-2026.md)). A voice profile is re-identifying even
  without names.

These sharpen the existing mitigation: keep `out/` private and review-gated,
and treat "patterns not quotes" as necessary-but-not-sufficient.

## Open questions (for ingest/lint)

- Does a richer profile raise regurgitation risk, and is there a point of
  diminishing safety?
- Should the profile redact named entities at synthesis time? **Partially
  settled (brief 15):** we detect verbatim n-gram leaks but deliberately *don't*
  redact/strip — entity-NER was dropped (multilingual, error-prone, and removing
  names doesn't remove style-based re-identifiability). Detection + manual review,
  not automatic redaction.

## Sources

[Privacy Not Just Memorization](../sources/privacy-not-just-memorization.md), [Deanonymization 2026](../sources/deanonymization-2026.md),
[Individual Turing Test 2026](../sources/individual-turing-test-2026.md). Related: [style-card artifact](style-card-artifact.md).
