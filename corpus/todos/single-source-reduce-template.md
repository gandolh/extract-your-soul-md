# Single-source the reduce template + bullet shapes (stop Path A drift)

**Priority:** P2 · **Goal:** engineering · **Impact:** medium · **Effort:** S · **Status:** todo · **Captured:** 2026-06-16

## Problem
The reduce template + rules are hand-duplicated into
`.claude/skills/extract-soul/SKILL.md:47-97` and already drift cosmetically from
[prompts.ts](../../src/prompts.ts) (en-dash vs ASCII hyphen variants). Bullet
shapes are re-stated in `.claude/agents/soul-chunk-extractor.md:30-61`. Every
fidelity edit must be made twice or the two executors diverge — and the Claude
path is the higher-quality one, so silent drift there is the most damaging.

## Decision / approach (audit-refined)
- `SKILL.md:43` already says "use the REDUCE prompt structure defined in
  src/prompts.ts" — finish the job: delete the duplicated fenced block (47-91),
  instruct the orchestrator to **Read `REDUCE_PROMPT_HEADER` at run time** and
  follow it exactly.
- **Keep** SKILL.md-only content with no prompts.ts equivalent: the
  conditional-section rule (line 97) and the Hard rules / regurgitation-privacy
  block (117-122).
- For `soul-chunk-extractor.md` (tools: `Read`), replace the duplicated bullet
  lists (28-61) with a directive to Read the MAP headers from prompts.ts per the
  chunk's `# Kind:` header.
- Add a one-line fallback ("if the file is unreadable, use the structure below")
  so a moved prompts.ts degrades gracefully.

## First step
Delete the duplicated block at `SKILL.md:47-91`; rewrite step 3 to Read
`REDUCE_PROMPT_HEADER` at run time, preserving lines 97 and 117-122.

## Dependencies & sequencing
Do this **before** the prompt-edit todos (reframe, anti-generic, drift-anchor,
gate-sections) so each lands in one place.

## Refs
code: [prompts.ts](../../src/prompts.ts), `.claude/skills/extract-soul/SKILL.md`, `.claude/agents/soul-chunk-extractor.md` · corpus: [decisions.md](../wiki/decisions.md)
