---
type: concept
status: open-question
tags: [privacy, safety, memorization, my-soul]
updated: 2026-06-05
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
  [[../log]].
- **`out/my-soul.md` is not auto-copied downstream** — manual eyeball review is
  the deliberate safety net against regurgitation. (Root `CLAUDE.md`,
  "Privacy boundary".)
- The extractor is instructed to capture *patterns*, not *quotes*.

## What the 2024-2026 privacy literature adds

The risk is broader than verbatim quoting:

- **Inference beats memorization.** "Privacy is not just memorization"
  ([[../sources/privacy-not-just-memorization]]): 92% of privacy research
  targets training-data memorization, but the worse harms are inference-time
  leakage and agent-enabled aggregation. Better verbatim memorization does
  *not* straightforwardly mean more leakage — a capable model leaks by
  inference. So "don't memorize exact text" is **not** a sufficient mitigation.
- **Style alone re-identifies.** De-anonymizing agents reconstruct 79.2% of
  identities from non-identifying writing cues + public info
  ([[../sources/deanonymization-2026]]). A voice profile is re-identifying even
  without names.

These sharpen the existing mitigation: keep `out/` private and review-gated,
and treat "patterns not quotes" as necessary-but-not-sufficient.

## Open questions (for ingest/lint)

- Does a richer profile raise regurgitation risk, and is there a point of
  diminishing safety?
- Should the profile redact named entities at synthesis time?

## Sources

[[../sources/privacy-not-just-memorization]], [[../sources/deanonymization-2026]],
[[../sources/individual-turing-test-2026]]. Related: [[style-card-artifact]].
