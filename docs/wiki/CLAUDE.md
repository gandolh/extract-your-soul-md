# Wiki schema — how to maintain `docs/wiki/`

This directory is an **LLM Wiki**: a persistent, interlinked knowledge base
about the research behind *extract-your-soul-md* — the psychology of voice,
personality frameworks, persona prompting, and the design decisions that flow
from them. The LLM writes and maintains every page here; a human curates
sources and asks questions.

The pattern (Memex-style, see [overview.md](overview.md)): instead of
re-deriving knowledge from the raw docs on every question, we **compile it once
into a wiki and keep it current.** Each new source is read, summarized, and
*integrated* — entity pages updated, contradictions flagged, the synthesis
revised. The cross-references are already there before you ask.

> If you are a Claude Code session asked to "ingest a source", "answer a
> research question", or "lint the wiki", follow the matching workflow below.

## Layers

1. **Raw sources** — immutable. The original design docs and any external
   material the wiki draws on. We never rewrite them; we summarize them into
   `sources/`. The raw design docs live one level up in `docs/`
   ([01-research-synthesis.md](../01-research-synthesis.md),
   [02-questionnaire-design.md](../02-questionnaire-design.md),
   [03-integration-plan.md](../03-integration-plan.md),
   [references.md](../references.md)). External sources are catalogued in
   [sources/](sources/) with their URLs.
2. **The wiki** — this directory. LLM-owned markdown: framework pages, concept
   pages, source summaries, the overview/synthesis.
3. **The schema** — this file. The conventions and workflows.

## Directory layout

```
docs/wiki/
  CLAUDE.md      ← this file (schema + workflows)
  index.md       ← content catalog: every page, one-line summary, by category
  log.md         ← chronological, append-only: ingests, queries, lint passes
  overview.md    ← the synthesis / current thesis of the whole wiki
  frameworks/    ← one page per personality/communication framework (entities)
  concepts/      ← one page per cross-cutting idea (dual-use signal, AI tells…)
  sources/       ← one page per external source: summary + takeaways + link
```

## Page conventions

- **Frontmatter** (YAML) on every page so Obsidian Dataview can query it:
  ```yaml
  ---
  type: framework | concept | source | overview
  status: kept | dropped | borrowed | open-question
  tags: [voice, big-five, ...]
  updated: 2026-06-05
  ---
  ```
  `status` on a framework page records the design verdict (see
  [01-research-synthesis.md](../01-research-synthesis.md)): `kept`,
  `dropped`, or `borrowed` (we use the *prompt*, not the *typology*).
- **Wikilinks**: link related pages with `[[frameworks/big-five]]`-style
  relative links written as markdown (`[Big Five](frameworks/big-five.md)`),
  so they work both in plain markdown and in Obsidian. Link liberally.
- **One concept per page.** If a page starts covering two ideas, split it.
- **Cite the source.** Every factual claim should trace to a `sources/` page
  or to `../references.md`. Put a "Sources" section at the bottom.
- **Verdict up top.** Framework pages lead with a one-line verdict
  (e.g. "Verdict: *borrowed* — we use the core-fear prompt, not the typing").

## Workflows

### Ingest a source

1. Read the source.
2. Discuss the key takeaways with the human (1-3 sentences each).
3. Write/update a page in `sources/` with: full citation, URL, year, 3-5
   bullet takeaways, and which wiki pages it touches.
4. Update the affected `frameworks/` and `concepts/` pages — fold the new
   finding in, and **flag contradictions** with existing claims explicitly
   ("⚠️ contradicts [[concepts/...]] which says …").
5. Revise [overview.md](overview.md) if the synthesis shifts.
6. Update [index.md](index.md) (add/relabel the page).
7. Append an entry to [log.md](log.md):
   `## [YYYY-MM-DD] ingest | <source title>` + a one-line note on what changed.

### Answer a question

1. Read [index.md](index.md) to find relevant pages, then drill in.
2. Synthesize an answer **with citations** to wiki pages.
3. If the answer is durable (a comparison, a new connection), **file it back**
   as a new `concepts/` page rather than letting it vanish into chat.
4. Append a `## [YYYY-MM-DD] query | <question>` entry to [log.md](log.md).

### Lint the wiki

Periodically health-check. Look for:
- Contradictions between pages.
- Stale claims a newer source has superseded.
- Orphan pages (no inbound links) — add links or merge.
- Concepts mentioned but lacking their own page — create stubs.
- Missing cross-references between obviously-related pages.
- Data gaps fillable with a web search — suggest them to the human.

Append a `## [YYYY-MM-DD] lint` entry to [log.md](log.md) summarizing findings.

## Scope discipline

This wiki is about **the research and design**, not the codebase. Don't
duplicate what the code or root `CLAUDE.md` already documents (pipeline
mechanics, file structure). When a research finding *changes the design*, note
the implication and link to the relevant root doc, but the wiki's job is the
*why*, not the *how-to-run*.
