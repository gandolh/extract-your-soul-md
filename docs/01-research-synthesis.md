# Research Synthesis

What we evaluated, what we kept, and why. Conducted 2026-05-20.

## Context

The base extraction pipeline (chat logs → `my-soul.md`) captures observable
style well but misses values, beliefs, narrative identity, hidden topics,
and self-perception. The question was: can a structured personality
questionnaire fill those gaps, and if so, which framework gives the highest
ROI per question asked?

Four research streams ran in parallel:

1. Big Five / Five Factor Model — the academic standard.
2. MBTI and 16personalities (NERIS) — the popular standard.
3. Alternatives: HEXACO, Enneagram, Hippocratic 4 temperaments.
4. Voice-specific research: LIWC linguistics, narrative identity,
   communication-style frameworks.

## Big Five (FFM / OCEAN)

The dominant trait taxonomy in academic psychology. Five dimensions
(Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism),
each with sub-facets in the NEO-PI-R (6 facets per domain, 30 total) and
BFI-2 (3 facets per domain, 15 total).

**Validated short instruments**:

- **BFI-2** (Soto & John 2017): 60 items, 5-point Likert. Free for research.
  Translations: French, German, Japanese, Polish, Spanish, Croatian. No
  Romanian validation found.
- **BFI-2-S / BFI-2-XS**: 30 / 15 items, domain-level only at XS length.
- **TIPI** (Gosling Lab): 10 items, 7-point Likert. Fully free for any use.
  Validated in 18 languages — no Romanian. Internal consistency α ≈ .53
  (acceptable as a coarse anchor, not for facets).
- **IPIP-NEO** (120 / 60 item variants): public domain, no license needed.

**Linguistic correlates** (from Yarkoni 2010, Pennebaker, Mairesse et al.):

- **Openness** — longer words, intellectual vocabulary, articles and
  prepositions (analytic structure). Strongest linguistic predictor.
- **Extraversion** — more social words, positive emotion, higher word count.
- **Neuroticism** — first-person singular ("I"), negative emotion words.
- **Agreeableness** — first-person plural ("we"), positive emotion, fewer
  anger words.
- **Conscientiousness** — weakest linguistic signal of all five.

**The key meta-analytic finding** (Koutsoumpis et al. 2023, n=85,724):
self-report Big Five ↔ LIWC correlations are |ρ| = .08–.14 (~5% variance).
Observer-report Big Five from text correlates much more strongly
(|ρ| = .18–.39, ~38% variance). This is the single most important number
in this whole research effort: **self-report instruments are weak
predictors of writing voice**.

## MBTI and 16personalities

Honest scientific assessment, condensed:

- **Test-retest reliability** is poor — ~50% of takers receive a different
  4-letter type on retest (Pittenger 1993/2005).
- **Forced dichotomies** are wrong — underlying score distributions are
  unimodal, not bimodal. Most people score near the midpoint, where a
  one-point shift flips a letter.
- **Predictive validity** is weak — Stein & Swan (2019) and Adam Grant both
  conclude MBTI fails on agreement-with-data, testability, and internal
  consistency. Grant called it "astrology for nerds."
- 16personalities (NERIS) adds a fifth dimension (Assertive / Turbulent)
  which is just Big Five Neuroticism inverted, then relabels MBTI types
  with friendlier names ("Architect," "Mediator," etc.).

**Why MBTI is still useful for *this* tool**: despite the science, the
N/S, T/F, and A/T axes *do* map to observable writing differences —
abstract vs. concrete language, logic-framed vs. relationship-framed
arguments, confident vs. hedged tone. And MBTI vocabulary is widely
understood by users, so it works as a user-facing self-report prompt
("if you've taken this, what did it say and what felt right?") even if
we don't use the underlying model.

Conclusion: do not score MBTI ourselves. Ask a single optional question
about prior MBTI/Enneagram results as background context.

## HEXACO, Enneagram, 4 Temperaments

**HEXACO** (Lee & Ashton 2004) adds a sixth factor on top of the Big Five:
**Honesty-Humility** — sincerity, fairness, greed-avoidance, modesty.
This is the only mainstream framework that cleanly isolates the
moral-behavioral cluster that Big Five collapses into noisy
low-Agreeableness. For *voice* purposes, H captures whether someone
writes with self-promotion or self-deprecation, with status-signaling or
modesty — a real dimension that Big Five mostly misses.

Instruments: HEXACO-PI-R 60 / 100 / 200 items at hexaco.org (free for
non-profit research). Public-domain alternative: IPIP-HEXACO-60.

**Enneagram** (9 motivational types, each defined by a core fear and core
desire). Psychometrically weak — a 2020 systematic review of 104 samples
found "mixed evidence of reliability and validity," and Luke Smillie calls
it "pseudoscientific at best." Factor analyses recover fewer than nine
factors.

**But**: the Enneagram's *narrative vocabulary* — core fear, core desire,
disintegration arrows under stress — is qualitatively richer than any
trait model for understanding *why* someone writes the way they do.
Worth one prompt borrowed from it ("what do you most want to be seen as,
and what do you most fear being seen as?") even without scoring.

**4 Temperaments** (Hippocrates / Galen, formalized by Keirsey 1978):
Sanguine, Choleric, Melancholic, Phlegmatic. Mathematically equivalent to
the Extraversion × Neuroticism plane of the Big Five with only 4 buckets
— too coarse to be useful directly. Of historical interest only.

## Voice-specific frameworks

This stream changed the design more than the trait-research streams did.

**LIWC** (Pennebaker, Boyd, Mehl). Function words (pronouns, articles,
prepositions) are better personality signals than content words because
they're deployed automatically without conscious control. First-person
singular ("I") rises with self-focused attention, depression, and low
status — not narcissism. Pennebaker's "Secret Life of Pronouns" is the
core reference here.

**DISC** (Marston) — workplace communication framework. Useful insight:
its Dominance / Influence axis splits "extraversion" into "direct vs.
warm" — a distinction Big Five collapses but which matters a lot for
voice.

**Process Communication Model** (PCM, Kahler). Used by NASA and Pixar
(Inside Out was built on it). Identifies six types each with a distinct
*channel* (directive, requestive, nurturative, informative, interruptive)
and *perceptual frame* (thoughts, opinions, reactions, actions, inaction,
feelings). Maps directly to sentence-level patterns. One well-aimed
question ("when something happens, your first reaction is usually: a
thought / opinion / gut reaction / action / feeling") captures most of
this.

**Schulz von Thun's four-sides model** (1981). Every message carries four
simultaneous layers: factual content, self-revelation, relationship
signal, appeal. The *ratio* between layers is a fingerprint. Captured
implicitly by the "rapport vs. report" question.

**Tannen** (sociolinguistics). The rapport / report axis — writing to
connect vs. writing to inform — predicts question density, hedging
frequency, and warmth markers. Real and useful, independent of gender
(despite Tannen's original framing).

**Nielsen Norman Group's four tone-of-voice dimensions** (a UX-research
distillation): formal↔casual, serious↔funny, respectful↔irreverent,
matter-of-fact↔enthusiastic. Surface-observable, immediately useful for
LLM register calibration.

**McAdams' narrative identity framework** (1995, 2013). The single
highest-leverage finding for this project. People structure their life
stories with either *redemptive sequences* (bad → growth) or
*contamination sequences* (good → ruined), and this structural choice
predicts agentive vs. passive sentence construction across *all* their
writing — not just when they're describing adversity. One well-asked
life-story prompt captures more voice signal than a 60-item Likert scale.

**Open-ended interview research** (Frontiers 2022, life-narrative AI
modeling 2025). Three to five open-ended questions outperform structured
questionnaires for predicting language behavior. The free-text response
is *both* self-report *and* language sample simultaneously.

## What the research pushed us toward

The voice-specific stream reordered the priority of everything else.
The decision tree we ended up with:

1. **Open-ended written prompts dominate Likert scales** for this use case
   because they yield voice samples that the existing chunker can ingest
   directly. Every Likert item is "wasted budget" by comparison.
2. **Don't try to score any single framework.** The user isn't getting a
   personality report; they're producing input for an LLM to imitate them.
   Scoring adds engineering complexity for low marginal value.
3. **Borrow the *prompts* of multiple frameworks, not their *typologies*.**
   The McAdams life-story prompt, the Enneagram core-fear/want prompt,
   and the Schulz von Thun / Tannen communication-style questions each
   pull a different dimension that no single framework spans.
4. **One small concession to traits**: a single optional question about
   the user's existing MBTI / Enneagram self-knowledge, used as
   user-supplied context, not as scoring input.

## Frameworks dropped from the final design

- Full BFI-2 (60 items): too slow, low marginal ROI when the free-text
  prompts already surface trait-relevant content.
- TIPI: cheap (10 items) but the variance it explains (~5%) is duplicated
  by the free-text prompts at lower cost.
- Full HEXACO scoring: keep the H-factor *intuition* (sincerity vs.
  flattery, modesty vs. grandiosity) as a probe inside the values
  question, but no separate 4-item block.
- Enneagram typing (RHETI): use one Enneagram-style *prompt* (core
  fear/want), do not attempt to assign a type.
- 4 Temperaments: subsumed by Big Five E × N, no unique signal.
- DISC, PCM scoring: borrow the perceptual-frame insight into a single
  question; no separate instrument.

## What survived into the final design

See [02-questionnaire-design.md](02-questionnaire-design.md) for the full
question set with rationale. In summary: 10 open-ended prompts + 1
optional metadata question, all free-text, each one chosen because:

- It pulls a dimension the chat logs cannot see; AND
- Its answer doubles as a voice sample in the user's actual writing.
