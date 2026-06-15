---
type: overview
status: kept
tags: [voice, synthesis, thesis]
updated: 2026-06-05
---

# Overview — the thesis of this wiki

The job of *extract-your-soul-md* is not to *describe* a person's personality.
It is to produce input an LLM can use to **imitate one specific person's
writing voice** consistently, across sessions. Everything in this wiki is
weighed against that single goal.

## The one finding that reorganized everything

Self-report personality questionnaires (Big Five, MBTI) correlate only weakly
with how someone actually writes — about |ρ| = .08–.14, ~5% of variance.
Observer-reports *from text* correlate far more strongly (|ρ| = .18–.39, ~38%).
See [self-report vs observer gap](concepts/self-report-vs-observer-gap.md).

Implication: for voice imitation, a Likert questionnaire is mostly wasted
budget. What works is **open-ended written prompts** — because each answer is
simultaneously a trait signal *and* a sample of the person's actual writing.
See [dual-use signal](concepts/dual-use-signal.md).

## What we build, in order of leverage

1. **Observed voice** from chat logs — vocabulary, rhythm, humor, register.
   The base pipeline. Strong on *how* they write, blind to *why*.
2. **Open-ended questionnaire** — fills the blind spots chats can't see:
   values, beliefs, narrative identity, hidden interests, and the gap between
   how they write and how they *want* to. See
   [Questionnaire Design](sources-raw/02-questionnaire-design.md) for the 10+1 question set.
3. **Synthesis into `my-soul.md`** — a structured voice profile (a "style
   card"), not a personality report.

## How we treat frameworks

We **borrow prompts, not typologies.** No framework is scored. Each earns its
place only if it pulls a dimension the chat logs cannot see *and* its answer
doubles as a voice sample. The per-framework verdicts:

| Framework | Verdict | Why |
|---|---|---|
| [Big Five](frameworks/big-five.md) | borrowed | Linguistic correlates guide what to extract; not self-scored. |
| [MBTI / 16personalities](frameworks/mbti-16personalities.md) | borrowed | One optional self-knowledge question; never scored. |
| [HEXACO](frameworks/hexaco.md) | borrowed | Honesty-Humility *intuition* probed inside the values question. |
| [Enneagram](frameworks/enneagram.md) | borrowed | Core-fear/want *prompt* only; no typing. |
| [Four Temperaments](frameworks/four-temperaments.md) | dropped | Subsumed by Big Five E×N. |
| [LIWC](frameworks/liwc.md) | kept | Function-word signal directly shapes extraction. |
| [McAdams Narrative Identity](frameworks/mcadams-narrative-identity.md) | kept | Highest-leverage single prompt. |
| [Communication Style](frameworks/communication-style.md) | borrowed | Tannen/Schulz/DISC/PCM/NNG → register & rapport questions. |
| [LLM Persona Techniques](frameworks/llm-persona-techniques.md) | kept | 2024-2026 prior art for what `my-soul.md` is: a transferable NL style spec. |

## What the 2024-2026 literature settled (and didn't)

A literature sweep (logged [2026-06-05](log.md#2026-06-05-ingest-2024-2026-persona-voice-imitation-literature-sweep))
of recent persona/voice-imitation work, summarized in
[LLM Persona Techniques](frameworks/llm-persona-techniques.md):

- **Confirmed**: open-ended narrative beats Likert *and* LIWC for trait/voice
  elicitation (Nature 2025, [dual-use signal](concepts/dual-use-signal.md)).
- **Confirmed in spirit**: a machine-generated natural-language style spec
  (PROSE, POPI) improves imitation and is portable across models — exactly the
  `my-soul.md` shape ([style-card artifact](concepts/style-card-artifact.md)).
- **New caveat**: persona expression *drifts* over long generations regardless
  of model — re-inject the profile, don't trust persistence
  ([LLM Persona Techniques](frameworks/llm-persona-techniques.md)).
- **New caveat**: acquaintances detect imitation; strangers don't
  ([regurgitation risk](concepts/regurgitation-risk.md)) — matches the humanize-text use case more
  than impersonation.
- **Sharper risk**: style alone re-identifies (79.2%), and inference leaks
  more than memorization ([regurgitation risk](concepts/regurgitation-risk.md)).

## Open questions

- Does a structured "style card" beat raw text examples *head-to-head* for LLM
  imitation, and by how much? Supported but never measured directly.
  (Tracked in [style-card artifact](concepts/style-card-artifact.md).)
- How much does verbatim-regurgitation / inference risk grow as the profile
  gets richer? (Tracked in [regurgitation risk](concepts/regurgitation-risk.md).)
- Should the question set add a second *targeted* (event-specific) narrative
  prompt to sharpen facet signal? (Tracked in [dual-use signal](concepts/dual-use-signal.md).)

## Sources

The synthesis above is distilled from
[Research Synthesis](sources-raw/01-research-synthesis.md) and the sources catalogued in
[references](sources-raw/references.md) and [sources/](sources/).
