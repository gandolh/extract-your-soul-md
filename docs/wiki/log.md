# Wiki log

Append-only, chronological. One entry per ingest / query / lint. Entries start
with `## [YYYY-MM-DD] <op> | <subject>` so the log is greppable:
`grep "^## \[" log.md | tail -5`.

## [2026-06-05] init | wiki created from existing design docs

Bootstrapped the LLM Wiki from the four existing design docs
([../01-research-synthesis.md](../01-research-synthesis.md),
[../02-questionnaire-design.md](../02-questionnaire-design.md),
[../03-integration-plan.md](../03-integration-plan.md),
[../references.md](../references.md)).

Created:

- Schema [CLAUDE.md](CLAUDE.md), [index.md](index.md), this log,
  [overview.md](overview.md).
- 8 framework pages (Big Five, MBTI/16personalities, HEXACO, Enneagram, Four
  Temperaments, LIWC, McAdams, communication-style) with per-framework
  kept/dropped/borrowed verdicts.
- 6 concept pages (dual-use-signal, self-report-vs-observer-gap,
  llm-style-imitation-gap, style-card-artifact, regurgitation-risk, ai-tells).
- 6 source summaries for the highest-leverage citations.

Open questions seeded for later enrichment: [style-card-artifact](concepts/style-card-artifact.md),
[regurgitation-risk](concepts/regurgitation-risk.md),
[llm-style-imitation-gap](concepts/llm-style-imitation-gap.md),
[ai-tells](concepts/ai-tells.md) — all flagged `status: open-question`,
pending the 2024-2026 persona/voice-imitation literature sweep (in progress).

## [2026-06-05] ingest | 2024-2026 persona/voice-imitation literature sweep

Folded in ~18 sources (2024-2026) from a web research pass across five angles:
LLM persona/style imitation, structured style artifacts, open-ended elicitation,
AI tells, and privacy pitfalls.

New pages:

- Framework: [frameworks/llm-persona-techniques.md](frameworks/llm-persona-techniques.md).
- 15 source summaries (PROSE, POPI, imitate-style, cognitive-simulation,
  CharacterBot, stable-personas, SPASM, individual-turing-test,
  genai-openended-scoring, life-narratives-prompts, wikipedia-signs-of-ai-writing,
  last-fingerprint-emdash, avoid-ai-writing-skill, deanonymization,
  privacy-not-just-memorization).

What changed:

- [concepts/style-card-artifact.md](concepts/style-card-artifact.md) — PROSE &
  POPI confirm the NL-style-spec approach in spirit; head-to-head vs. raw
  examples still untested. Best results pair spec + examples.
- [concepts/llm-style-imitation-gap.md](concepts/llm-style-imitation-gap.md) —
  corroborated: style mimicked better than structure; AI output lower
  perplexity.
- [concepts/dual-use-signal.md](concepts/dual-use-signal.md) — **confirmed and
  quantified** (Nature 2025: open-ended beats Likert *and* LIWC). Nuance:
  targeted event prompts isolate facets better.
- [concepts/regurgitation-risk.md](concepts/regurgitation-risk.md) — sharpened:
  style cues re-identify 79.2%; inference leaks more than memorization, so
  "no verbatim memorization" is necessary-but-not-sufficient.
- [concepts/ai-tells.md](concepts/ai-tells.md) — sourced catalogue replaces the
  seed list (Wikipedia signs, em-dash-as-markdown-leak, avoid-ai-writing).
- [overview.md](overview.md) — added a "what the literature settled" section
  and a new open question (second targeted narrative prompt).

⚠️ Contradiction check: no source contradicted the open-ended > Likert
assumption; it was confirmed. The one *nuance* (targeted vs. broad prompts) is
logged as an open question, not a contradiction.

Note: arxiv IDs/years are reported as the research agent returned them; a few
2026 IDs should be link-verified on a future lint pass before citing externally.
