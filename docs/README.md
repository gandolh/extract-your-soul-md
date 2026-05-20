# Documentation

Design documents for the **personality-questionnaire extension** to
[extract-your-soul-md](../README.md).

Status: research and design complete (2026-05-20). Implementation not yet started.

## Why this extension exists

The base project extracts a voice profile from chat logs. That works well for
*observable* style — vocabulary, punctuation, sentence rhythm, humor patterns,
recurring topics that come up in conversation. It does not capture:

- Values and beliefs the user never argues about in chats.
- Topics of deep interest that don't come up with their WhatsApp contacts.
- Self-perception vs. observed behavior — and the gap between them.
- Aspirational register (how they *want* to write).
- Narrative identity — the structure of the story they tell about themselves.

A short, well-designed interview surfaces all of these. The answers are then
fed into the same extract step that already handles chat logs.

## Files

- [01-research-synthesis.md](01-research-synthesis.md) — personality
  frameworks evaluated (Big Five, MBTI/16personalities, HEXACO, Enneagram,
  4 temperaments, communication-style models), the voice-specific research
  that reordered priorities, and the design decisions that followed.
- [02-questionnaire-design.md](02-questionnaire-design.md) — the 10+1
  question set in English and Romanian with per-question rationale, the
  REPL UX spec, and the `answers.md` file format.
- [03-integration-plan.md](03-integration-plan.md) — how the questionnaire
  path slots into the existing `process → chunk → extract` pipeline,
  file-by-file change list, and the implementation order for resuming
  later.
- [references.md](references.md) — sources cited across the design docs.

## TL;DR for someone coming back cold

1. The CLI gains an `--interview` flag that launches a Node `readline`-based
   REPL asking ~10 open-ended questions.
2. Answers are appended to `inputs/questionnaire/answers.md` as the user
   types them (crash-safe).
3. The existing [/extract-soul skill](../.claude/skills/extract-soul/SKILL.md)
   is extended to read the answers file if present, then either augments
   `out/my-soul.md` if it exists or creates one from scratch.
4. The whole questionnaire flow uses no LLM at REPL time. The interview is
   dumb; the interpretation is smart.

## The single most important research finding

Self-report Big Five and MBTI questionnaires correlate weakly with
linguistic style — about ρ = .08–.14, ~5% of variance
([Koutsoumpis et al. 2023](https://www.researchgate.net/publication/369321862)).
Observer-reports from text correlate much more strongly (ρ = .18–.39, ~38%
variance). For a tool that imitates writing voice, **open-ended written
responses are dual-use**: each answer is simultaneously a trait signal
*and* a voice sample. That insight is why the question set is short and
all free-text, with no Likert scales.
