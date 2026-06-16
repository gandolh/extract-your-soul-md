# 24 — Set onboarding expectations: scope + Ollama dependency (copy)

**Priority:** P3 · **Goal:** ease-of-use · **Impact:** low · **Effort:** S · **Status:** done · **Promoted:** 2026-06-16 (from `todos/onboarding-expectations-copy.md`) · **Done:** 2026-06-16

## Problem
IntroPage never stated the real commitment — no count of the prompts, and never
warned that Ollama must be running for the final "Generate" step.

## Outcome (2026-06-16) — copy only
- step-01 desc: "Three short forms — 11 open-ended prompts in all. Take your time;
  longer answers carry more of you. …" (effort framing, not a speed/"~15 min" cue —
  a speed cue would undercut the prose-is-signal design).
- step-03 desc: "…this runs locally and needs a running Ollama server. …"
- **No invented status field** — kept copy-only per the audit. (Note: brief 20
  since added a real `ollamaReady` field, but it lives on ResultsPage where the
  Generate button is; Intro stays copy-only.)

Verified in-browser: both step cards render the new copy. Typecheck + build clean.
Nothing committed.

## Refs
code: [IntroPage.tsx](../../../frontend/src/pages/IntroPage.tsx) · related: [20-ollama-preflight-timeout-retry](20-ollama-preflight-timeout-retry.md)
