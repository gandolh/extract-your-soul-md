# 37 — Choice-based trait studies + per-test reports

## Problem

The questionnaire is all free-text (Q1–Q12). That free-text doubles as
voice sample + trait signal — which is right for *voice*, but it has high
activation energy (blank-page friction) and produces no clean
*personality profile*. The user wants:

1. **Choice questions** grounded in real instruments, to profile
   personality, with **optional free-text** ("say more") preserved.
2. **Two question types** in studies: choice-based trait questions PLUS a
   free-text "completion" category that adds narrative voice.
3. **Per-test report sections** (Big Five, HEXACO-H, Tone, PCM, MBTI) shown
   in the UI, scored from the choices, **passed to the LLM** to synthesize
   into `soul.md`.
4. **Conversations** should carry the speech-pattern load (so the two
   sources stop overlapping: questionnaire = traits, conversations = voice).

## The tension with locked decisions (and the reconciliation)

`sources-raw/01-research-synthesis.md` and `02-questionnaire-design.md`
lock two relevant calls:

- **"All open-ended, no Likert"** — because self-report ↔ LIWC voice
  correlation is only |ρ|=.08–.14 (~5% variance). Likert is "wasted
  budget" *for predicting voice*.
- **"Do not score MBTI ourselves"** — ~50% retest type-flip, unimodal
  distributions, weak predictive validity ("astrology for nerds").

**Reconciliation** (why this brief does not relitigate those):

- The user **changed the division of labor**: conversations now own voice;
  the questionnaire owns *traits*. For traits specifically, validated
  instruments ARE choice/Likert-based. The old all-free-text rule existed
  because there was one input lane doing both jobs. There are now two.
- Scores are emitted as a **self-report profile block, explicitly labeled
  self-report and ranked BELOW observed voice** in the reduce prompt. This
  preserves the |ρ|=.08 guardrail — computed scores never override the
  conversation-derived voice.
- **MBTI**: added as its own questionnaire that shows the user their type,
  but with an **include-in-soul toggle defaulting OFF**. So by default MBTI
  never reaches `soul.md` (the locked decision holds); the user can
  consciously opt in. The MBTI report carries a self-report caveat.

## Design

### Instruments (license-clean — researched 2026-06-17)

- **Big Five** — TIPI (Gosling 2003), 10 items, free/unrestricted. 5-point
  adapted scale; items 2,4,6,8,10 reverse-keyed; 2 items/dimension.
- **HEXACO Honesty-Humility** — IPIP-HEXACO items (public domain). Focus on
  Modesty/Sincerity facets (modesty ↔ self-promotion). ~5 items.
- **Tone** — NN/g four axes (framework citable): formal↔casual,
  serious↔funny, respectful↔irreverent, matter-of-fact↔enthusiastic. Plus
  Tannen rapport↔report. 5-point bipolar each.
- **PCM perceptual frame** — Kahler's six frames (framework-inspired, NOT a
  copied proprietary instrument): thoughts / opinions / emotions /
  reflections / reactions / actions. Single-select.
- **MBTI** — use **OEJTS** items (open source, openpsychometrics.org), NOT
  trademarked MBTI items. 16 items (4/axis: E/I, S/N, T/F, J/P). Shows the
  familiar 4-letter type as a friendly label.

### Data model

Choice answers still ride the unchanged `study_answers {id,title,body}`
contract. Body is a parser-safe encoded string:

```
## Q13 — Openness
choice: 4
note: especially sci-fi worldbuilding
```

(`choice:` holds the picked value(s); `note:` the optional prose.)
`answers-file.ts` owns `encodeChoiceBody` / `decodeChoiceBody`.

### Reports (new `reports` table)

`reports(user_id, report_key, payload_json, include_in_soul, updated_at)`,
PK `(user_id, report_key)`. Scored & upserted when choices are saved.
`payload_json` holds axis percentages + categorical labels. Defaults:
trait/tone/PCM `include_in_soul=1`, MBTI `=0`. Per-section UI toggle.

Reports show **axis percentages** (honest about midpoint closeness), not
just labels.

### Extraction

`pipeline.ts` reads only `include_in_soul=1` reports, renders a
**self-report profile block** into the reduce prompt (labeled self-report,
ranked below observed voice). MBTI block carries its caveat. Freeform map
prompt sharpened to target speech patterns (sentence length, hedging,
emoji/punctuation, opener/closer rituals, code-switching).

## Files

`src/questions.ts`, `src/studies.ts`, `src/answers-file.ts`,
`src/db/schema.sql` + `src/db/repos.ts`, a new scoring module
(`src/scoring.ts`), `src/server/routes/studies.ts` (+ report routes),
`frontend/src/api/client.ts`, `frontend/src/pages/StudyPage.tsx`,
report-section UI, `frontend/src/pages/ResultsPage.tsx`,
`src/server/pipeline.ts`, `src/prompts.ts`.

## Acceptance

- Choice questions render as scale/radio with optional say-more; free-text
  studies unchanged.
- Each test has a report section with percentages + an include toggle;
  MBTI defaults OFF, others ON.
- `answers.md` format unchanged in shape (choice bodies are valid sections).
- Only included reports reach the reduce prompt, labeled self-report.
- typecheck + build green.

## Outcome (2026-06-17)

Shipped. Two-band studies live: 3 voice (free-text, unchanged) + 4 profile
(choice) — Big Five (TIPI, Q13-22), Stance & Tone (HEXACO-H + NN/g + Tannen,
Q23-28), First Reaction (PCM, Q29), Type Indicator (OEJTS, Q30-45). Choice
answers ride the unchanged study_answers body contract via
encode/decodeChoiceBody. New `reports` table stores scored payloads +
include_in_soul. Per-section toggle in the UI; MBTI defaults OFF, others ON.
Reduce prompt gains a `hasProfile` self-report-weighting rule that keeps
observed voice winning every style call. Freeform map prompt sharpened toward
speech patterns. Scoring is pure + golden-tested (reverse-key cancellation,
MBTI second-letter map). build:server + typecheck:web + 22 node:test pass.

Not done (deferred, low value): StudiesPage doesn't visually group by band (all
7 list flat); choice `choice: N` lines still flow into answers.md/QA map as mild
noise (notes are real voice; bare picks are harmless). UI verified by build +
types only — user to eyeball the live forms.
