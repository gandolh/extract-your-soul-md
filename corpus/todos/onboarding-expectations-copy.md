# Set onboarding expectations: scope + Ollama dependency

**Priority:** P3 · **Goal:** ease-of-use · **Impact:** low · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
[IntroPage.tsx](../../frontend/src/pages/IntroPage.tsx) never states the real
commitment — no count of the 11 prompts across 3 studies, and never warns that a
local Ollama server must be running for the final "Generate" step. The task feels
unbounded and step 03 can fail for a reason the UI never set up.

## Decision / approach (audit-refined — copy only, no invented status field)
- step-01 card: "Three short forms — 11 open-ended prompts in all."
- step-03 card: one line that extraction runs locally and needs a running Ollama
  server (echoes ResultsPage, but upfront).
- **Frame as effort, not speed:** use "take your time — longer answers carry more
  of you", NOT "~15 minutes" (a speed cue undercuts the prose-is-signal design and
  the existing "vent, ramble" coaching).
- **Drop** the live `ollamaReady` indicator from this change — that field doesn't
  exist; it's a separate task (belongs with
  [ollama-preflight-timeout-retry](ollama-preflight-timeout-retry.md)).

## First step
Edit the step-01 and step-03 card `desc` strings in
[IntroPage.tsx](../../frontend/src/pages/IntroPage.tsx).

## Refs
code: [IntroPage.tsx](../../frontend/src/pages/IntroPage.tsx) · corpus: [self-report-vs-observer-gap](../wiki/concepts/self-report-vs-observer-gap.md)
