---
type: source
status: kept
tags: [ai-tells, tool, claude-code-skill, ai-patterns]
year: 2025
updated: 2026-06-05
---

# avoid-ai-writing (2025) — Claude Code skill

**Link**: https://github.com/conorbronsdon/avoid-ai-writing
**Type**: open-source tool

## Takeaways

- Implements 50 named AI-pattern detectors across content/language/structural/
  communication categories.
- 109-entry vocabulary replacement table (tiered); detects copula avoidance,
  synonym cycling, "not X, it's Y", inline-header list inflation, chatbot
  artifacts ("I hope this helps!"), and confidence-calibration markers ("It's
  worth noting that").

## Why it matters

Directly deployable as source material for the project's `ai-patterns.md`
(used by the `add-soul` skill). Overlapping design goals — a good starting
catalogue to adapt rather than reinvent.

## Touches

[[../concepts/ai-tells]] (primary), [[../concepts/style-card-artifact]].
