# Cognitive-functions study (Michael Caloz test review) — DEFERRED

**Priority:** P3 · **Goal:** accuracy · **Impact:** low-medium · **Effort:** M · **Status:** deferred · **Captured:** 2026-06-26 · **Updated:** 2026-06-26

## Source
[michaelcaloz.com/personality](https://www.michaelcaloz.com/personality/) — a
Jungian **cognitive-functions** typing test. Same four-letter (E/I, S/N, T/F,
P/J) surface as MBTI, but its distinctive layer is the **8 cognitive functions**
(Ti/Te, Fi/Fe, Si/Se, Ni/Ne) arranged into an ordered *function stack* per type
(primary → auxiliary → tertiary → inferior). Methodology: **forced-choice paired
scenarios** ("definitely A … neutral … definitely B" on a 5-point lean), ~15–20
min, and results are **ranked fit scores across all 16 types** (self-identify,
not a hard verdict). Explicitly "not MBTI®" — his own questions, model, and
scoring algorithm.

## Verdict: borrow the *concept*, not the test
Two parts of Caloz overlap things we **already do**:
- We already ship an **MBTI instrument** — the OEJTS-16 study → `mbti` report
  ([scoring.ts](../../src/scoring.ts), see [[trait-scoring-conventions]]).
- We already use **scale / forced-lean choices** (`choiceMode: 'scale'`,
  [questions.ts](../../src/questions.ts) Q30+) and report **percent-toward-pole,
  not hard types** — Caloz's "ranked fit scores, you self-identify" philosophy is
  already ours.

So the only genuinely *new* idea is the **cognitive-function stack** as a richer
model of *how* a person processes information and decides (Ne brainstorming vs Si
detail-recall; Te structure vs Fi value-driven). That is more textured than the
four OEJTS dichotomies and could feed soul.md's `## Personality Notes` /
Communication-Style guidance with concrete directional hints ("processes by
generating options, not narrowing them").

## Hard blocker: licensing
Caloz's **questions and scoring are proprietary** (his own model). The project's
instrument bar (locked in [[trait-scoring-conventions]] / decisions) is
**public-domain or CC-licensed only** (Mini-IPIP, TIPI, TIVI, NCS-6 CC-BY,
OEJTS). We **cannot lift his items or algorithm**. If we want a cognitive-function
axis, it must come from an **openly-licensed Jungian-function inventory** (e.g.
the open SLOAN/Big-Five-adjacent function items, or a public-domain function
questionnaire) — sourced and cited the same way every other instrument is.

## Decision / approach (DEFERRED)
- **Don't add another full type system on top of the MBTI we already have** —
  diminishing returns for soul.md, which cares about voice + motivation, not a
  16-type label. Caloz validates our *existing* design more than it asks us to
  change it.
- *If* pursued: add it the **data-only way** — append public-domain
  forced-choice function items to [questions.ts](../../src/questions.ts) under a
  new `functionKey` (Ti/Te/Fi/Fe/Si/Se/Ni/Ne), add a `cognitive-functions`
  `ReportKey` + scorer + switch case in [scoring.ts](../../src/scoring.ts), a new
  `profile` `Study` in [studies.ts](../../src/studies.ts), and a hedged
  reduce-prompt note in [prompts.ts](../../src/prompts.ts). Follow the full
  new-report checklist in [[trait-scoring-conventions]].
- **Gated on**: (a) a real demand signal that the existing MBTI report is too
  coarse for soul.md, and (b) finding an openly-licensed function inventory worth
  adapting. Neither has fired.

## Refs
source: https://www.michaelcaloz.com/personality/ · code:
[questions.ts](../../src/questions.ts), [scoring.ts](../../src/scoring.ts),
[studies.ts](../../src/studies.ts), [prompts.ts](../../src/prompts.ts) · corpus:
[wiki/frameworks/](../wiki/frameworks/), [decisions.md](../wiki/decisions.md)
