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
See [[concepts/self-report-vs-observer-gap]].

Implication: for voice imitation, a Likert questionnaire is mostly wasted
budget. What works is **open-ended written prompts** — because each answer is
simultaneously a trait signal *and* a sample of the person's actual writing.
See [[concepts/dual-use-signal]].

## What we build, in order of leverage

1. **Observed voice** from chat logs — vocabulary, rhythm, humor, register.
   The base pipeline. Strong on *how* they write, blind to *why*.
2. **Open-ended questionnaire** — fills the blind spots chats can't see:
   values, beliefs, narrative identity, hidden interests, and the gap between
   how they write and how they *want* to. See
   [[../02-questionnaire-design]] for the 10+1 question set.
3. **Synthesis into `my-soul.md`** — a structured voice profile (a "style
   card"), not a personality report.

## How we treat frameworks

We **borrow prompts, not typologies.** No framework is scored. Each earns its
place only if it pulls a dimension the chat logs cannot see *and* its answer
doubles as a voice sample. The per-framework verdicts:

| Framework | Verdict | Why |
|---|---|---|
| [[frameworks/big-five]] | borrowed | Linguistic correlates guide what to extract; not self-scored. |
| [[frameworks/mbti-16personalities]] | borrowed | One optional self-knowledge question; never scored. |
| [[frameworks/hexaco]] | borrowed | Honesty-Humility *intuition* probed inside the values question. |
| [[frameworks/enneagram]] | borrowed | Core-fear/want *prompt* only; no typing. |
| [[frameworks/four-temperaments]] | dropped | Subsumed by Big Five E×N. |
| [[frameworks/liwc]] | kept | Function-word signal directly shapes extraction. |
| [[frameworks/mcadams-narrative-identity]] | kept | Highest-leverage single prompt. |
| [[frameworks/communication-style]] | borrowed | Tannen/Schulz/DISC/PCM/NNG → register & rapport questions. |
| [[frameworks/llm-persona-techniques]] | kept | 2024-2026 prior art for what `my-soul.md` is: a transferable NL style spec. |

## What the 2024-2026 literature settled (and didn't)

A literature sweep (logged [[log#2026-06-05-ingest-2024-2026-persona-voice-imitation-literature-sweep|2026-06-05]])
of recent persona/voice-imitation work, summarized in
[[frameworks/llm-persona-techniques]]:

- **Confirmed**: open-ended narrative beats Likert *and* LIWC for trait/voice
  elicitation (Nature 2025, [[concepts/dual-use-signal]]).
- **Confirmed in spirit**: a machine-generated natural-language style spec
  (PROSE, POPI) improves imitation and is portable across models — exactly the
  `my-soul.md` shape ([[concepts/style-card-artifact]]).
- **New caveat**: persona expression *drifts* over long generations regardless
  of model — re-inject the profile, don't trust persistence
  ([[frameworks/llm-persona-techniques]]).
- **New caveat**: acquaintances detect imitation; strangers don't
  ([[concepts/regurgitation-risk]]) — matches the humanize-text use case more
  than impersonation.
- **Sharper risk**: style alone re-identifies (79.2%), and inference leaks
  more than memorization ([[concepts/regurgitation-risk]]).

## Open questions

- Does a structured "style card" beat raw text examples *head-to-head* for LLM
  imitation, and by how much? Supported but never measured directly.
  (Tracked in [[concepts/style-card-artifact]].)
- How much does verbatim-regurgitation / inference risk grow as the profile
  gets richer? (Tracked in [[concepts/regurgitation-risk]].)
- Should the question set add a second *targeted* (event-specific) narrative
  prompt to sharpen facet signal? (Tracked in [[concepts/dual-use-signal]].)

## Sources

The synthesis above is distilled from
[[../01-research-synthesis]] and the sources catalogued in
[[../references]] and [sources/](sources/).
