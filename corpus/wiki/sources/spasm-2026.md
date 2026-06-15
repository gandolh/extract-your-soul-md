---
type: source
status: kept
tags: [llm, persona-drift, echoing, acl]
year: 2026
updated: 2026-06-05
---

# SPASM (2026) — Stable Persona-driven Agent Simulation

**Link**: https://arxiv.org/abs/2604.09212 (ACL 2026 Findings)

## Takeaways

- Names three multi-turn failure modes: **persona drift**, **role confusion**,
  and **echoing** (an agent gradually mirroring its partner).
- Egocentric Context Projection (ECP) stores history perspective-agnostically
  and projects it per-agent — eliminates echoing, reduces drift, no weight
  changes.

## Touches

[LLM Persona Techniques](../frameworks/llm-persona-techniques.md) (primary),
[style-card artifact](../concepts/style-card-artifact.md).
