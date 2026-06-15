# Log

Chronological, append-only. Newest entries at the bottom. One entry per
meaningful change. Entry kinds: `done` | `todo` | `maintenance` | `incident` |
`decision` | `ingest` | `lint`. Absolute dates only.

> The research wiki keeps its own history at [wiki/log.md](wiki/log.md)
> (ingest / query / lint passes from before the corpus migration). This log
> covers corpus structure and engineering work.

## [2026-06-15] maintenance | Adopted corpus-flow; migrated the LLM Wiki into corpus/

Integrated the `corpus-flow` skill at the repo root. Created the `corpus/`
skeleton (todos/, briefs/{todo,done,superseded}/, CLAUDE.md, index.md, this log)
and the wiki spine (overview already existed; added status.md,
architecture.md, decisions.md, open-questions.md).

Migrated the pre-existing LLM Wiki from `docs/wiki/` into `corpus/wiki/`:

- Moved `overview.md`, `index.md`, `log.md` and the `frameworks/`, `concepts/`,
  `sources/` subdirs verbatim.
- The four raw design docs (`01-research-synthesis.md`,
  `02-questionnaire-design.md`, `03-integration-plan.md`, `references.md`) plus
  the web-UI design docs (`design.md`, `stitch-design-brief.md`) moved to
  `corpus/wiki/sources-raw/` as the immutable source layer.
- Converted all Obsidian `[[wikilinks]]` to standard relative markdown links and
  repointed every raw-doc link to the new `sources-raw/` location (corpus-flow
  forbids wikilinks — repos render in VSCode/GitHub).
- Folded the old wiki maintenance schema (research ingest/query/lint workflows)
  into [CLAUDE.md](CLAUDE.md); the standalone schema file was removed.
- Removed `docs/` entirely (its `README.md` redirect stub and the rest had all
  moved into the corpus). Updated the root `CLAUDE.md`, `README.md`,
  `src/questions.ts`, and `frontend/src/components/ui.tsx` references.

Plain `mv` (not `git mv`) per the user's choice; nothing committed — the user
controls when this lands in git.
