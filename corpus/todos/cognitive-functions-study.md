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
Caloz's **questions and scoring are proprietary** (his own model). Crediting him
is **not** a license — attribution is a *condition* of permissive licenses, not a
substitute for one. The unprotectable *ideas* (Jungian functions, the function
stack, forced-choice format, ranked fit scores) we can use freely and cite him as
inspiration; his specific **items and scoring algorithm** we cannot copy without a
grant from him. The project's instrument bar (locked in
[[trait-scoring-conventions]] / decisions) is **public-domain or CC-licensed
only** (Mini-IPIP, TIPI, TIVI, NCS-6 CC-BY, OEJTS).

## The "adapt an open inventory" path has a catch (checked 2026-06-26)
Chosen default = adapt an openly-licensed function inventory instead of Caloz.
But a web survey shows there isn't a clean one:
- **The only *open* Jungian instruments measure the 4 dichotomies, not the 8
  functions** — the OEJTS/OJTS family (openpsychometrics, OpenJung). That is
  *exactly what our existing `mbti` report already captures*, not Caloz's
  distinctive function-stack layer. Adopting it duplicates what we have.
- **OEJTS is CC BY-NC-SA 4.0**, not public domain — the **NC** (non-commercial)
  and **SA** (share-alike) clauses are a snag for a project that otherwise sticks
  to commercially-usable items. (Our existing `mbti` report already leans on
  OEJTS, so that clause may already be in the tree — worth a separate check.)
- **The real 8-function tests (Sakinorva, IDRlabs, Keys2Cognition/Nardi) are all
  proprietary.** No clean, openly-licensed *function-stack* inventory exists to
  adapt.
- The only truly-public-domain raw material is **IPIP** — but it has no canonical
  8-Jungian-function scale, so this becomes *construct + validate our own function
  items*, a research effort, not an adaptation.

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
  coarse for soul.md, and (b) the appetite to *construct + validate our own*
  IPIP-sourced function items (since no open function-stack inventory exists to
  adapt). Neither has fired — and per the catch above, this is a research build,
  not a quick data-only add.

## Refs
source: https://www.michaelcaloz.com/personality/ · open instruments surveyed:
[openpsychometrics OEJTS](https://openpsychometrics.org/tests/OEJTS/),
[IPIP](https://ipip.ori.org/) · code:
[questions.ts](../../src/questions.ts), [scoring.ts](../../src/scoring.ts),
[studies.ts](../../src/studies.ts), [prompts.ts](../../src/prompts.ts) · corpus:
[wiki/frameworks/](../wiki/frameworks/), [decisions.md](../wiki/decisions.md)
