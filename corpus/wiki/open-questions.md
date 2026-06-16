# Open questions

Only the **genuinely unresolved**. The moment a question is answered or shipped,
**delete it from here** — its history lives in [status.md](status.md) +
[log.md](../log.md). This page must stay trustworthy as "what's actually open."

## Engineering / product

- **Does `/api/extract` need a job queue?** It's synchronous today; an Ollama run
  can take minutes (Fastify `requestTimeout` is raised to cope). A queue +
  polling is the obvious next step — not yet decided whether to build it.
- **When to migrate `node:sqlite` → `better-sqlite3`?** Experimental warning is
  suppressed; migration is mechanical but unscheduled.

## Research (tracked in detail on the concept pages)

- **Does a structured "style card" beat raw text examples head-to-head for LLM
  imitation, and by how much?** Supported but never measured directly. See
  [concepts/style-card-artifact.md](concepts/style-card-artifact.md).
- **How much does regurgitation / inference risk grow as the profile gets
  richer?** See [concepts/regurgitation-risk.md](concepts/regurgitation-risk.md).
- ~~**Should the question set add a second *targeted* (event-specific) narrative
  prompt to sharpen facet signal?**~~ **Resolved** (2026-06-16, brief 31): added
  Q12 narrative high-point alongside Q4's low-point, so agentive framing is
  sampled too. See [concepts/dual-use-signal.md](concepts/dual-use-signal.md).
- **A few 2026 arxiv IDs/years in the sources should be link-verified before
  citing externally** (flagged in [log.md](log.md), 2026-06-05 ingest).
