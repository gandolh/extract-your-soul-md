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

## [2026-06-16] todo | Captured the soul.md improvement backlog (34 todos)

Ran a multi-agent audit of the whole repo (6 subsystems mapped, 46 ideas →
deduped to 33, each adversarially verified against the code + the research wiki),
then grilled the user through the key decision tree and captured the outcome as
one `todos/` file per idea, tiered **P1 (8) / P2 (17) / P3 (9)**
with priority + dependency notes.

The diagnostic headline: three compounding silent bugs in the **Ollama** path cap
accuracy regardless of prompt quality —
(1) chunks pack to 30k but `num_ctx`=8192, so ~73% of each chunk is silently
truncated (and the reduce step overflows too);
(2) the `.cache/bullets` key omits model/prompt/ctx, so prompt edits silently
reuse stale bullets; (3) extraction is non-deterministic (`temp 0.3`, no seed).
These + a never-built eval harness are the P1 "foundation cluster".

Decisions locked during the grill (baked into the todos):
- Truncation: chunk budget **derives from `num_ctx`**; keep 8192 default.
- Reduce overflow: **assert-fail backstop now**; hierarchical tree-reduce
  deferred (spun off as its own P3 todo).
- Determinism: `temp 0` + **fixed constant seed** (not in cache key).
- Cache: fingerprint key with **live prompt-hash** + model + ctx (no manual
  version constant).
- Eval: **local deterministic metrics first**, LLM-judge optional; CLI-only;
  framed as a relative A/B signal (per the individual-Turing-test ceiling).
- Prompt reframe: permit **short non-private stylistic tokens only**; flag the
  em-dash as an AI tell; few-shot "Representative Samples" deferred behind the
  n-gram guard.
- Q12 high-point narrative: existing study, **required**, data-only.
- Async extract: **full job model** (DB-backed restart-safe lock + progress);
  the interim running-flag fix is folded into it.
- Name match: **normalize + exact** (no fuzzy); zero-match assertion in the web
  layer, not the shared core.

Several proposals were knocked down by the research during verification and are
recorded as such inside their todos (broad entity-redaction, the observer-
advantage confidence weight, stripping the QA voice bullets, cross-linking a
non-existent `ai-patterns.md`). Next step when work starts: promote a P1 todo to
a numbered `briefs/todo/` spec. Nothing committed.

## [2026-06-16] brief 01 — cache-fingerprint (done)

Promoted `cache-fingerprint-prompt-model-ctx` (the P1 foundation prerequisite)
to `briefs/todo/01`, implemented it, and moved it to `briefs/done/01` with an
outcome note. Change in `src/stages/extract.ts`: header selection moved above the
key computation; cache key now folds in `kind / ollamaModel / ollamaNumCtx /
ollamaTemperature / hash(header) / content` (was `kind + content` only). Seed
excluded by design; reduce caching untouched. `npm run build` clean. This
unblocks all prompt-iteration work — prompt/model/ctx/temp edits now invalidate
the bullet cache instead of silently reusing stale extractions. Next in the P1
build-order: `extraction-context-budget-truncation`. Nothing committed.

## [2026-06-16] brief 02 — context-budget truncation (done)

Promoted `extraction-context-budget-truncation` to `briefs/todo/02`, implemented,
moved to `briefs/done/02`. The single largest silent accuracy loss in the Ollama
path: 30k chunks were fed to an 8192-ctx map call and silently truncated to ~8k
(~30% of corpus). Fix: `src/stages/chunk.ts` now derives
`budget = min(chunkTargetTokens, ollamaNumCtx − 600 header − 512 output)` and
packs/splits against it (8192 ctx → 7080 budget, warns on clamp; manifest records
the effective budget). `src/stages/extract.ts` gained `assertFitsContext()` as a
backstop before both map and reduce `generate()` calls — fails loudly instead of
truncating. `.env.example` documents the
`chunkTargetTokens + header + output < num_ctx` invariant. `npm run build` clean.
Reduce overflow backstop is interim; hierarchical tree-reduce stays the proper
fix (still a todo). Next in P1 build-order: `deterministic-extraction-temp-seed`,
then the eval harness (`style-card-eval-harness`). Nothing committed.
