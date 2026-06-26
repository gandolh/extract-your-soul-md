# 38 — Cognitive-functions study (IPIP→function-stack report)

**Priority:** P3 · **Goal:** accuracy · **Impact:** low-medium · **Effort:** M · **Status:** done · **Promoted:** 2026-06-26 (from `todos/cognitive-functions-study.md`, overriding its "keep deferred" recommendation per explicit user decision) · **Done:** 2026-06-26

## Outcome (2026-06-26)
Shipped as the `cognitive-functions` report. Built by a sub-agent in an isolated
worktree, integrated to main.
- **16 items, Q90–Q105** (2 per function), all `choiceMode:'scale'`, value 5 = the
  function, no reverse. Mapping documented in a block comment in `questions.ts`:
  Ne←Openness/Ideas-Adventurousness, Ni←converging-vision/underlying-meaning,
  Si←Conscientiousness/Orderliness-Cautiousness, Se←present/sensory-acting,
  Te←Achievement-Discipline/measurable-results, Ti←internal-consistency/own-framework,
  Fe←Sympathy-Cooperation/reading-the-room, Fi←own-values/authenticity. e/i split
  by object- vs subject-oriented framing, not raw Big-Five Extraversion.
- `scoreCognitiveFunctions` averages items per `functionKey` → 8 `AxisResult`s
  (0–100); `summary` = top-2 as `Lead: X → Y (exploratory)`; strong "home-grown
  IPIP→function mapping, not a validated instrument — directional hint only"
  caveat. `DEFAULT_INCLUDE['cognitive-functions'] = false` — **the first and only
  exception to the "all reports on" premise** (commented as such).
- New `profile`-band `Study` (placed last); FE `ReportKey` union updated in
  `frontend/src/api/client.ts`. **`frontend/src/studyOrder.ts` does not exist** —
  study order is backend-driven (the `STUDIES` array order). `ReportSection.tsx`
  is shape-agnostic; no change.
- `buildProfileText` picks up the new report automatically (it iterates included
  reports via `renderReportForPrompt`, no hardcoded keys) — so an opted-in user's
  function block flows into the reduce prompt + swipe-card generator with no extra
  wiring.
- **Integrator** added a hedged clause to `REDUCE_PROFILE_RULE` in `prompts.ts`
  (kept off the sub-agent to avoid a parallel collision with brief 39): a profile
  reading that carries its own "exploratory/home-grown" caveat is demoted to a
  tentative directional hint, deferring to the validated readings + observed voice.
- **Tests:** 3 golden tests in `src/scoring.test.ts` (all-high-Ne → Ne leads;
  8 axes; no-answer → `hasData:false`; DEFAULT_INCLUDE false). Full suite green;
  typecheck:web + typecheck:test + lint clean.

## Decision (grilled 2026-06-26)
Build the **full study** — but honestly, as an unvalidated home-grown construct.
The four grilled answers that pin the design:

1. **Item source = map public-domain IPIP facets → Jungian functions.** IPIP has
   no canonical 8-function scale, so we select IPIP items and map each to a
   function by the well-documented Big-Five↔function correspondence. Licensing is
   clean (IPIP is public domain). The *mapping* is our own heuristic — label it
   exploratory.
2. **Report shape = 8 function strengths (0–100), OFF by default.** Each of the 8
   functions (Ti/Te/Fi/Fe/Si/Se/Ni/Ne) gets a 0–100 axis, plus a derived top-2
   "stack" summary string (e.g. `Lead: Ne → Ti (exploratory)`).
   `DEFAULT_INCLUDE['cognitive-functions'] = false` — opt-in, NOT co-equal with
   the validated instruments. This is a deliberate exception to the "all reports
   on" premise (see [[trait-scoring-conventions]]); call it out in the
   `DEFAULT_INCLUDE` comment.
3. **Strong caveat**: "Home-grown IPIP→function mapping, not a validated
   instrument — directional hint only."

## Item set & mapping (theory-grounded)
Author forced-choice / 1–5 scale items sourced from public-domain IPIP facet
wordings, each tagged with a new `functionKey`. Suggested correspondences
(the agent should verify/refine against the Big-Five↔Jung literature and document
the rationale in the report `caveat` + a brief comment):

- **Ne** (extraverted intuition) ← Openness: *Ideas / Adventurousness* ("I jump
  to what could be", "I see possibilities everywhere")
- **Si** (introverted sensing) ← Conscientiousness: *Orderliness / Cautiousness*
  ("I rely on what has reliably worked before")
- ** Te** (extraverted thinking) ← Conscientiousness: *Achievement-striving /
  Self-discipline* ("I organize people and resources to hit a goal")
- **Ti** (introverted thinking) ← Intellect/Openness: *internal-consistency*
  ("I trust a framework I worked out myself over an established method")
- **Fe** (extraverted feeling) ← Agreeableness: *Sympathy / Cooperation* ("I tune
  to the group's mood and keep harmony")
- **Fi** (introverted feeling) ← Agreeableness(low-conformity)/values
  ("I act from my own values even when they clash with the group")
- **Ne/Ni** split, **Se/Si** split, **Te/Ti** split, **Fe/Fi** split: use
  extraversion-of-the-function framing (object-oriented vs subject-oriented) to
  separate the e/i pair, not raw Big-Five Extraversion.

Aim for **2 items per function (16 items)** as the psychometric floor (mirrors
the 4/trait Big-Five rationale in [[trait-scoring-conventions]]). Scale
convention is the project standard: value 1 = LEFT pole, 5 = RIGHT,
`reverse:true` flips. Use new question ids continuing the sequence in
[questions.ts](../../../src/questions.ts).

## Approach (follow the new-report checklist)
Per [[trait-scoring-conventions]] and the pattern in
[37-choice-trait-studies-and-reports.md](../done/37-choice-trait-studies-and-reports.md):

1. **[questions.ts](../../../src/questions.ts)** — add `'cognitive-functions'` to
   the `ReportKey` union; add a `functionKey?: 'Ti'|'Te'|'Fi'|'Fe'|'Si'|'Se'|'Ni'|'Ne'`
   field to `Question`; append the 16 items with `reportKey:'cognitive-functions'`
   + `functionKey` + `choiceMode:'scale'`.
2. **[scoring.ts](../../../src/scoring.ts)** — add `scoreCognitiveFunctions`:
   average items per `functionKey` via the existing `traitPercent` helper → 8
   `AxisResult`s; `summary` = top-2 functions by percent (`Lead: X → Y
   (exploratory)`); strong `caveat`. Add the key to `REPORT_KEYS`, a switch case
   in the dispatcher, and `DEFAULT_INCLUDE['cognitive-functions'] = false`.
3. **[studies.ts](../../../src/studies.ts)** — add a new `profile`-band `Study`
   grouping the 16 items.
4. **frontend** — add the key to the `ReportKey` union in
   `frontend/src/client.ts` (or wherever it mirrors) and the id to
   `frontend/src/studyOrder.ts`. `ReportSection.tsx` is shape-agnostic (maps over
   axes) — no change.
5. **[prompts.ts](../../../src/prompts.ts)** — **DO NOT TOUCH.** The hedged
   reduce-prompt note that mentions cognitive functions is added by the
   integrator during merge (prompts.ts is owned by brief 39 to avoid a parallel
   collision). The profile text builder (`buildProfileText`) should still pick up
   the new report automatically if it iterates `included` reports — verify it
   does; if it hardcodes report keys, add the case.

## Testing
- node:test golden test in a new `src/scoring.test.ts` (or alongside existing
  scoring tests): feed synthetic answers, assert the 8 axes + the top-2 stack
  summary + that `DEFAULT_INCLUDE` is false. Cover an all-high-Ne answer set →
  Ne leads; a no-answer set → `hasData:false`.
- `npm run typecheck:web` + `typecheck:test` clean.

## Refs
code: [questions.ts](../../../src/questions.ts), [scoring.ts](../../../src/scoring.ts), [studies.ts](../../../src/studies.ts), `frontend/src/client.ts`, `frontend/src/studyOrder.ts` · corpus: [[trait-scoring-conventions]], [37](../done/37-choice-trait-studies-and-reports.md), [decisions.md](../../wiki/decisions.md) · source: [IPIP](https://ipip.ori.org/), [michaelcaloz.com/personality](https://www.michaelcaloz.com/personality/) (inspiration only)
