---
type: framework
status: borrowed
tags: [tannen, schulz-von-thun, disc, pcm, nng, register, voice]
updated: 2026-06-05
---

# Communication-style frameworks

**Verdict: *borrowed*** — several frameworks each contribute one question's
worth of signal about *register* and *rapport*. None is scored.

A cluster of frameworks that, unlike trait models, speak directly to
sentence-level writing patterns:

- **Tannen — rapport vs. report.** Writing to connect vs. to inform. Predicts
  question density, hedging frequency, warmth markers. → Q6.
- **Schulz von Thun — four-sides model.** Every message carries factual
  content, self-revelation, relationship signal, and appeal; the *ratio*
  between them is a fingerprint. Captured implicitly by Q6.
- **DISC.** Splits "extraversion" into *direct vs. warm* (Dominance vs.
  Influence) — a distinction [Big Five](big-five.md) collapses but that matters for voice.
- **Process Communication Model (PCM).** Six perceptual frames (thoughts,
  opinions, reactions, actions, inaction, feelings); a person's default frame
  shows up at sentence level. One probe captures most of it.
- **Nielsen Norman tone-of-voice** — four practical axes: formal↔casual,
  serious↔funny, respectful↔irreverent, matter-of-fact↔enthusiastic.
  Surface-observable; directly useful for LLM register calibration.

## How they're used

Folded into the **code-switching** (Q5), **rapport-vs-report** (Q6), and
**humor** (Q7) questions. The point is to map the *range* of registers a person
maintains, so the downstream LLM knows which voice to use in which context —
chat logs usually only show one or two.

## Sources

Communication-style cluster in [references](../sources-raw/references.md). Related:
[style-card artifact](../concepts/style-card-artifact.md).
