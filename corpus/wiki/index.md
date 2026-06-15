# Wiki index

Content catalog for the *extract-your-soul-md* research wiki. Start at
[overview.md](overview.md) for the synthesis; read [../CLAUDE.md](../CLAUDE.md)
for the corpus conventions and the research-wiki ingest / query / lint
workflows; see [log.md](log.md) for this wiki's history.

> This research wiki now lives inside the corpus. For **project state**
> (status, architecture, decisions, open questions) see the corpus-flow spine:
> [status.md](status.md), [architecture.md](architecture.md),
> [decisions.md](decisions.md), [open-questions.md](open-questions.md). The
> corpus front door is [../index.md](../index.md).

## Overview

- [overview.md](overview.md) — the thesis: build input for *voice imitation*,
  not a personality report. Per-framework verdict table.

## Concepts

- [concepts/dual-use-signal.md](concepts/dual-use-signal.md) — every open-ended
  answer is both a trait signal and a voice sample. The keystone principle.
- [concepts/self-report-vs-observer-gap.md](concepts/self-report-vs-observer-gap.md)
  — self-report ↔ style is ~5% variance; observer-from-text is ~38%.
- [concepts/llm-style-imitation-gap.md](concepts/llm-style-imitation-gap.md) —
  LLMs reproduce explicit style well, implicit style poorly. *Open question.*
- [concepts/style-card-artifact.md](concepts/style-card-artifact.md) —
  `my-soul.md` as a structured style spec vs. raw examples. *Open question.*
- [concepts/regurgitation-risk.md](concepts/regurgitation-risk.md) — verbatim
  leakage & privacy; mitigations. *Open question.*
- [concepts/ai-tells.md](concepts/ai-tells.md) — anti-patterns that read as
  AI; source list for `ai-patterns.md`. *Open question.*

## Frameworks (entities)

| Page | Verdict | One-liner |
|---|---|---|
| [frameworks/big-five.md](frameworks/big-five.md) | borrowed | Linguistic correlates guide extraction; not scored. |
| [frameworks/mbti-16personalities.md](frameworks/mbti-16personalities.md) | borrowed | One optional self-knowledge prompt; never scored. |
| [frameworks/hexaco.md](frameworks/hexaco.md) | borrowed | Honesty-Humility intuition in the values question. |
| [frameworks/enneagram.md](frameworks/enneagram.md) | borrowed | Core-fear/want prompt only; no typing. |
| [frameworks/four-temperaments.md](frameworks/four-temperaments.md) | dropped | Subsumed by Big Five E×N. |
| [frameworks/liwc.md](frameworks/liwc.md) | kept | Function-word signal shapes extraction. |
| [frameworks/mcadams-narrative-identity.md](frameworks/mcadams-narrative-identity.md) | kept | Highest-leverage single prompt. |
| [frameworks/communication-style.md](frameworks/communication-style.md) | borrowed | Tannen/Schulz/DISC/PCM/NNG → register & rapport questions. |
| [frameworks/llm-persona-techniques.md](frameworks/llm-persona-techniques.md) | kept | 2024-2026 prior art: transferable NL style spec; style>substance; persona drift. |

## Sources (summaries)

### Foundational

- [sources/koutsoumpis-2023.md](sources/koutsoumpis-2023.md) — the ~5% vs. ~38%
  meta-analysis.
- [sources/yarkoni-2010.md](sources/yarkoni-2010.md) — per-trait linguistic
  signatures.
- [sources/mcadams-2013.md](sources/mcadams-2013.md) — narrative identity.
- [sources/frontiers-2022.md](sources/frontiers-2022.md) — open-ended
  interviews beat questionnaires.
- [sources/pittenger-1993.md](sources/pittenger-1993.md) — MBTI reliability
  critique.
- [sources/arxiv-2509-14543.md](sources/arxiv-2509-14543.md) — LLMs struggle
  with implicit style.

### LLM persona / style imitation (2024-2026)

- [sources/prose-2025.md](sources/prose-2025.md) — NL style spec from samples
  (+33%). Closest analogue to `my-soul.md`.
- [sources/popi-2026.md](sources/popi-2026.md) — generator-transferable
  preference summary; beats context-stuffing.
- [sources/imitate-style-2025.md](sources/imitate-style-2025.md) — few-shot
  23.5× zero-shot; AI output lower perplexity (a tell).
- [sources/cognitive-simulation-2025.md](sources/cognitive-simulation-2025.md)
  — style mimicked better than narrative structure.
- [sources/characterbot-2025.md](sources/characterbot-2025.md) — facts give
  surface only; deeper voice needs more.
- [sources/stable-personas-2026.md](sources/stable-personas-2026.md) —
  observer-rated persona drifts over long sessions.
- [sources/spasm-2026.md](sources/spasm-2026.md) — drift / role-confusion /
  echoing failure modes + ECP fix.
- [sources/individual-turing-test-2026.md](sources/individual-turing-test-2026.md)
  — acquaintances detect imitation; strangers don't.

### Questionnaire / elicitation (2024-2026)

- [sources/genai-openended-scoring-2025.md](sources/genai-openended-scoring-2025.md)
  — Nature: open-ended beats Likert *and* LIWC (confirms the core assumption).
- [sources/life-narratives-prompts-2025.md](sources/life-narratives-prompts-2025.md)
  — targeted event prompts isolate facets better.

### AI tells (2024-2026)

- [sources/wikipedia-signs-of-ai-writing.md](sources/wikipedia-signs-of-ai-writing.md)
  — the comprehensive catalogue.
- [sources/last-fingerprint-emdash-2026.md](sources/last-fingerprint-emdash-2026.md)
  — em dash = markdown leakage; survives suppression.
- [sources/avoid-ai-writing-skill.md](sources/avoid-ai-writing-skill.md) — 50
  detectors + 109-word table; `ai-patterns.md` source.

### Privacy / pitfalls (2024-2026)

- [sources/deanonymization-2026.md](sources/deanonymization-2026.md) — style
  cues re-identify 79.2%.
- [sources/privacy-not-just-memorization.md](sources/privacy-not-just-memorization.md)
  — inference leaks more than memorization.

## Raw design docs (not part of the wiki layer)

These are the immutable source documents the wiki summarizes:

- [01-research-synthesis.md](sources-raw/01-research-synthesis.md)
- [02-questionnaire-design.md](sources-raw/02-questionnaire-design.md)
- [03-integration-plan.md](sources-raw/03-integration-plan.md)
- [references.md](sources-raw/references.md) — full citation list.

### Web-UI design docs

- [design.md](sources-raw/design.md) — the "Clinical Voice Instrument" design
  token spec (colors, type) for the web platform.
- [stitch-design-brief.md](sources-raw/stitch-design-brief.md) — prompt-ready
  design brief for the `soul.study` web UI.
