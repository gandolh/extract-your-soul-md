# Corpus — schema & conventions for `extract-your-soul-md`

This `corpus/` is the project's **LLM-maintained wiki + work tracker**. The
governing split: **the human curates sources and asks questions; the LLM curates
the synthesis and tracks the work.** It is the durable counterpart to the
in-session `TodoWrite` list and to chat — reusable findings get folded back here,
not left in conversation.

> **Read [index.md](index.md) first.** It is the front door — the catalog of what
> lives where.

## Layout

```
corpus/
  CLAUDE.md            ← this file (schema + conventions)
  index.md             ← content catalog; the front door
  log.md               ← chronological record of every meaningful change
  todos/               ← captured ideas/tasks as prose (pre-spec)
  briefs/
    todo/  done/  superseded/   ← numbered work specs (immutable once filed)
  wiki/                ← the LLM-curated synthesis layer (the knowledge base)
    index.md           ← the research-wiki catalog
    log.md             ← the research-wiki history (ingest/query/lint)
    overview.md        ← the thesis of the research
    status.md          ← dated snapshot of current project state
    architecture.md    ← structural map of the codebase
    decisions.md       ← locked tech/design choices (don't relitigate)
    open-questions.md  ← genuinely unresolved threads only
    frameworks/        ← one page per personality/communication framework
    concepts/          ← one page per cross-cutting research idea
    sources/           ← one page per external source: summary + link
    sources-raw/       ← immutable raw design docs (research + UI design briefs)
```

## The work lifecycle

```
todos/<date>-<slug>.md      capture an idea/task as prose
      │ promote
      ▼
briefs/todo/<NN>-<slug>.md   a numbered work spec, ready to build
      │ grill → plan → implement → verify
      ▼
briefs/done/<NN>-<slug>.md   moved verbatim (number kept) + outcome note
      │
      ├─► log.md             one chronological entry per meaningful change
      └─► wiki/              fold durable findings into the synthesis pages
```

- **briefs/ are immutable.** Once in `done/` or `superseded/`, don't edit (append
  an outcome note only at move time). New work → a new brief in `todo/`.
- **Numbers are stable.** Never renumber a brief when it moves between dirs.
- **The LLM owns `wiki/`** — rewrite pages freely as understanding improves;
  don't append-only.

## Conventions (load-bearing)

- **Standard relative markdown links, never Obsidian `[[wikilinks]]`.** The repo
  renders in VSCode/GitHub. From `wiki/<subdir>/x.md`, code refs are
  `../../../src/...`; raw docs are `../sources-raw/...`; sibling subdirs are
  `../<subdir>/y.md`.
- **Absolute dates** (`2026-06-15`), never "yesterday". Use today's date from the
  environment context; don't shell out to `date`.
- **One concept per file.** Split a wiki page past ~200 lines or straddling two
  topics; cross-link the halves.
- **Cite the source.** Research claims trace to a `sources/` page or
  `sources-raw/references.md`. Framework pages lead with a one-line verdict
  (`kept` / `dropped` / `borrowed`).
- **YAML frontmatter** on research wiki pages (`type`, `status`, `tags`,
  `updated`) is kept from the original wiki — it powers Obsidian Dataview and is
  an enrichment, not a requirement for new spine pages.

## Source-of-truth ordering (when pages or beliefs disagree)

1. The **actual code** wins over any wiki claim.
2. A brief in **`done/`** wins over `wiki/` if the wiki hasn't caught up.
3. **`decisions.md`** wins over `status.md` for tech choices not formally revisited.
4. For research/design disagreements, the **raw docs in `sources-raw/`** win in
   their domain (they're the immutable design record).

Verify any path/function/commit a page names before acting on it — pages drift.

## Scope split: research wiki vs. project state

- `wiki/{frameworks,concepts,sources,sources-raw}/` + `overview.md` are about the
  **research and design** (the *why*) — the original LLM Wiki, migrated here.
- `wiki/{status,architecture,decisions,open-questions}.md` are about the
  **project** (the *how* and *where it stands*) — the corpus-flow spine.
- The root `CLAUDE.md` (one level up from `corpus/`) owns pipeline mechanics and
  run commands; don't duplicate them here — link to them.

## Workflows

This corpus follows the `corpus-flow` skill. In short: **add a todo** → capture
prose in `todos/`; **promote** → numbered spec in `briefs/todo/`; **work a
brief** → grill, plan, implement, verify; **complete** → move to `done/`, log it,
fold findings into `wiki/`; **ingest** → update wiki pages + log; **lint** →
sweep for contradictions, stale claims, orphans. Every meaningful change gets a
`log.md` entry. Never commit unless the user asks.

### Research-wiki specifics (`wiki/frameworks`, `wiki/concepts`, `wiki/sources`)

The research layer carries a few extra conventions, inherited from the original
LLM Wiki:

- **YAML frontmatter** on every research page (`type`, `status`, `tags`,
  `updated`) — powers Obsidian Dataview; keep it current on edits.
- **Verdict up top** on framework pages: a one-line `kept` / `dropped` /
  `borrowed` call.
- **Cite the source.** Every factual claim traces to a `sources/` page or to
  `sources-raw/references.md`; put a "Sources" section at the bottom.
- **Ingest a source** → read it, write/update a `sources/` page (citation, URL,
  year, 3–5 takeaways), fold the finding into the affected `frameworks/` and
  `concepts/` pages, **flag contradictions explicitly**, revise
  [wiki/overview.md](wiki/overview.md) if the synthesis shifts, update
  [wiki/index.md](wiki/index.md), and append a
  `## [YYYY-MM-DD] ingest | <title>` entry to [wiki/log.md](wiki/log.md).
- **Lint** → sweep for contradictions, stale claims a newer source superseded,
  orphan pages, and concepts named but lacking a page; log a
  `## [YYYY-MM-DD] lint` entry.
