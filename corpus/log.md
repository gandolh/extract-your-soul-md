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

## [2026-06-16] brief 03 — deterministic extraction (done)

Promoted `deterministic-extraction-temp-seed` to `briefs/todo/03`, implemented,
moved to `briefs/done/03`. `src/ollama.ts`: `OllamaOptions` gained `seed` and it's
passed in the `/api/generate` options body. `src/stages/extract.ts`: fixed
`EXTRACTION_SEED = 42` threaded into both map and reduce `generate()` calls.
`src/config.ts` + `.env.example`: `OLLAMA_TEMPERATURE` default 0.3 → 0,
determinism documented as best-effort (GPU nondeterminism can leak). Seed is a
fixed constant, not env-configurable, not in the cache key. `npm run build` clean.

This closes the P1 foundation trio (01 cache-fingerprint + 02 truncation + 03
determinism) — prompt iteration is now honest: edits invalidate the cache, the
model sees the whole chunk, and output is attributable to the edit rather than
sampling noise. Next in P1 build-order: `style-card-eval-harness` (the eval
harness that turns this into a measured A/B signal). Nothing committed.

## [2026-06-16] brief 04 — collapse to API + frontend only (done)

Architectural decision (user, 2026-06-16): the project is **API + frontend only,
no CLI** — full commit to Ollama-only, single surface. New `briefs/todo/04`
(no source todo; decision-driven), implemented, moved to `briefs/done/04`.

Removed: the CLI orchestration in `src/index.ts` (inverted to a thin `runServe`
entry), `--interview`/`--ollama`/`--en` flags, `src/stages/interview.ts` (REPL),
`loadMyNames`+`MY_NAMES_FILE`+`myNamesFile` config field, the Claude
`/extract-soul` skill + `soul-chunk-extractor` agent, and the `start`/`interview`
npm scripts. The shared pipeline (`process → chunk → extract`) is untouched and
still invoked per-user by `server/pipeline.ts`. Docs rewritten: root CLAUDE.md,
README.md, `wiki/architecture.md`, `wiki/decisions.md` (recorded the locked
decision). `npm run build` + `typecheck:web` clean; server boots and serves /api.

This supersedes the CLI-only framing in the eval-harness todo
(`style-card-eval-harness`) — brief 05 will build eval as a synchronous
`POST /api/eval` endpoint + frontend view, not an `--eval` CLI flag. Nothing
committed.

## [2026-06-16] todo reconciliation after CLI removal (brief 04)

Swept all 16 todos that referenced the now-deleted CLI/Claude surfaces and
reconciled them to the API-only reality (user: strip silently, full sweep).

- **Deleted `single-source-reduce-template.md`** (P2) — its entire purpose was
  eliminating drift between `prompts.ts` and the two deleted Claude files
  (`SKILL.md`, `soul-chunk-extractor.md`). `prompts.ts` is now the sole source;
  nothing to single-source. Removed its inbound sequencing ref from
  `name-self-vs-observed-divergence` and `gate-questionnaire-conditional-sections`.
- **Stripped dead "mirror into the Claude path" instructions and `.claude/…`
  refs** from: anti-generic-reduce-guard, drift-anchor-reinjection,
  forbid-bullet-count-padding, gate-questionnaire-conditional-sections,
  map-prompt-responsibility-split, name-self-vs-observed-divergence,
  reframe-prompts-imitation-spec, representative-samples-fewshot,
  hierarchical-tree-reduce, ngram-verbatim-overlap-guard. The `prompts.ts` edit
  is now the whole job for each.
- **Rewrote `style-card-eval-harness`** to target `POST /api/eval` + a frontend
  view (was an `--eval` CLI flag); holdout source = user `conversations` rows /
  work-dir, A-condition spec = stored `soul.md` from the `results` table.
- **Rationale-only fixes**: token-accounting-header-model (Path A → the brief-02
  Ollama budget as the precision justification); extraction-context-budget-
  truncation (dropped the false "Claude path unaffected" line).
- **Cosmetic/stale-ref fixes**: persist-language-preference (`--en` prior art
  gone), multi-platform-import-adapters ("both CLI + web" → server's processAll),
  study-depth-guidance-hints ("two doors / REPL" → StudyPage),
  register-enumeration-rate-limit (index.ts:53 → :20 after the entry inversion).
- Updated `index.md` backlog tally (34→33 todos). Nothing committed.

## [2026-06-16] brief 05 — style-card eval harness (done)

Promoted `style-card-eval-harness` to `briefs/todo/05`, implemented, moved to
`briefs/done/05`. The project's headline bet (style card > raw examples for
imitation) is now measurable.

New `src/eval.ts` (pure stylometric metrics: burstiness, sentence-length
variance, TTR, function-word + char-distribution L1 distance) and
`src/server/eval-run.ts` (`runUserEval` — holdout built via throwaway work-dir +
`processAll`, three conditions A=soul.md / B=raw examples / C=both, scored against
the real continuation, content-hash cached, deterministic via temp 0 + fixed
seed, guarded by `NothingToEvalError`/`EvalBusyError` + per-user lock). Exposed as
synchronous `POST /api/eval` (+ `GET` status) with 400/409/500 guards; new
`EVAL_HOLDOUT_N`/`EVAL_RAW_K` config. Frontend `EvalPage` (per-condition metric
table + per-sample breakdown), `/eval` route + nav link, api client methods.

Verified: build + typecheck:web clean; smoke-tested route guards (200 status,
400 no-soul.md, 401 unauth). Caught + fixed a bad Tailwind class
(`border-border-subtle` → `border-hairline`) before ship. Deep generation path
needs a live Ollama, not exercised here. LLM-judge layer deferred (optional).

P1 foundation arc complete (briefs 01–05). Nothing committed.

## [2026-06-16] brief 06 — reframe prompts to imitation spec (done)

Promoted `reframe-prompts-imitation-spec` to brief 06, implemented, done. All
three headers in `src/prompts.ts` reframed from personality-report to style-card:
voice-first framing, explicit mechanical-feature asks (function-word habits,
message length, capitalization, emoji rate + which, signature tokens,
code-switch triggers), em-dash flagged as an AI tell (record, don't lean in).
Verbatim ban NARROWED (not lifted): ban private sentences + named entities, but
permit short non-private stylistic tokens verbatim — the imitable core. QA header
demoted its abstract-personality block to secondary; voice features lead.

Side-effect handled: headers grew (MAP 217→457, MAP_QA 377→565, REDUCE 575→741
tok), so bumped `HEADER_RESERVE` 600→768 in `chunk.ts` (+fixed stale comment) so
the per-chunk file header still fits on top of MAP_QA. Budget 7080→6912 at 8192
ctx; 715-tok worst-case headroom. Brief-01 cache fingerprint auto-invalidates the
bullet cache on this edit. `npm run build` clean.

NOT yet measured — the reframe should be validated with the brief-05 eval (A/B/C,
before vs. after) on a populated user + live Ollama; left as the next validation
step. P1 foundation arc (01–05) was complete; this is the first measurable
fidelity change on top of it. Nothing committed.

## [2026-06-16] brief 07 — name normalization + import validation (done)

Promoted `name-normalization-import-validation` to brief 07, implemented all 3
slices, done. Fixes the silent first-run failure where a mis-cased/`~`-prefixed/
bidi-marked name matched 0 messages and produced an empty soul.md with no warning.

- `normalizeName()` exported from `process.ts` (trim → strip `~` → strip
  zero-width/bidi → NFC → lowercase); `processAll` normalizes both the names Set
  and each sender (caller-proof).
- `ProcessStats.perSource` ({filename, parsedSenders, myLinesIn, linesOut}); new
  `NamesMismatchError` thrown from `runUserExtraction` (→ 400 in results route)
  when conversations parsed but matched 0 names globally, listing senders seen.
- `looksLikeWhatsAppExport()` + exported `BRACKETED`/`DASHED`; conversations POST
  returns 422 for non-WhatsApp uploads.

Verified: build + typecheck:web clean; normalizeName runtime cases pass; live
route test confirms 422 (bad upload) / 201 (real export) / 400 (names mismatch
path reasoned). Sequences before `import-sender-detection-diagnostics` (the UI
that surfaces `perSource`). Nothing committed.

## [2026-06-16] brief 08 — Ollama Cloud backend (done)

User request: run extraction against Ollama Cloud, key via env. Additive change,
local mode preserved. `src/ollama.ts` `OllamaOptions.apiKey?` → `Authorization:
Bearer <key>` when set. `config.ts` defaults flipped to cloud
(`OLLAMA_HOST=https://ollama.com`, `OLLAMA_MODEL=gpt-oss:120b-cloud`) + new
`OLLAMA_API_KEY` (blank default). `apiKey` threaded into all 3 `generate()` call
sites (extract.ts ×2, eval-run.ts ×1). `.env.example` Ollama block rewritten
(cloud default + local override). `wiki/decisions.md` updated.

Verified: build clean; mock-fetch test confirms Bearer header sent only with a
key (cloud) and omitted without (local). Real cloud call needs the user's key —
to be tested by the user. Content-hash caches (keyed incl. model) avoid
re-billing on identical re-runs. Nothing committed.

## [2026-06-16] brief 09 — tolerate empty JSON body (done)

Found during the brief-08 cloud test: `POST /api/extract` with json content-type
but no body returned Fastify's FST_ERR_CTP_EMPTY_JSON_BODY (400) before the route
ran. The real frontend dodges it (no body → no content-type), but it's a latent
trap for proxies/future callers. Added a custom `application/json` parser in
`server/app.ts` that treats empty/whitespace bodies as {} and still 400s on
malformed JSON. Verified all four cases on a throwaway server; build clean. No
frontend change needed. Nothing committed.

## [2026-06-16] brief 10 — bump OLLAMA_NUM_CTX to 32768 (done)

Follow-on from brief 08: on gpt-oss:120b-cloud (128k ctx), num_ctx=8192 clamped
the chunk budget to 6912. Set OLLAMA_NUM_CTX=32768 (config default + live .env +
.env.example), so budget = min(30000, 32768-768-512) = 30000 — full target, no
clamp (verified by running chunkAll in-process: manifest chunkTargetTokens=30000,
was 6912). Also refreshed the stale chunking comment in .env.example (reserves
768 not 600, post brief-06). build:server clean; cloud extract still ~23s. 32768
is the right stop — higher gives nothing unless CHUNK_TARGET_TOKENS rises too.
Nothing committed.

## [2026-06-16] brief 11 — import sender-detection diagnostics (done)

Promoted `import-sender-detection-diagnostics` to brief 11, implemented, done.
The UI completion of brief 07: makes a names mismatch visible + fixable at import
time (07 only failed loudly at extract time).

Backend: `detectSenders()` + `DetectedSender` exported from process.ts (groups by
normalizeName, labels with most-frequent raw spelling, sums counts); new
`GET /api/conversations/senders` merges across the user's conversations
(names-independent, no Ollama). Frontend: `api.senders()`, new
`frontend/src/lib/normalizeName.ts` mirror (verified identical to backend, KEEP
IN SYNC note), ImportPage Step 1 shows sender chips w/ counts → click appends raw
name to the textarea (skips if normalized form already present), live "matched N
of M" line + loud zero-match warning, all derived from the draft textarea.

Decisions: group by normalized + show raw spelling; chips paste raw name; match
count computed client-side from /senders counts + draft names (no extra endpoint).
Verified: build + typecheck:web clean; /senders grouping live-tested
(Cristian/~Cristian/CRISTIAN → 1 sender, count 4); normalize mirror agrees.

This clears the last UX-correctness P1. Only open P1 left: autosave-study-answers
(S). Nothing committed.

## [2026-06-16] brief 12 — autosave study answers (done)

Promoted `autosave-study-answers` to brief 12, implemented, done. Frontend-only
(StudyPage.tsx): shared `persist()` (no toast/navigate), debounced 1500ms
autosave on `answers` guarded by a `baseline` ref (seed + study-switch don't
save), subtle idle/saving/saved indicator by the Meter, `beforeunload` guard when
dirty, manual save cancels pending autosave + refreshes baseline. useBlocker
skipped (declarative router). Verified: typecheck:web + build clean; partial
autosave round-trip live-tested (Q1 saved, blanks skipped, answered:1).

**This was the last open P1.** Backlog is now P2/P3 only. Nothing committed.

## [2026-06-16] brief 13 — anti-generic reduce guard (done)

Promoted `anti-generic-reduce-guard` to brief 13 (first P2 picked up after the
P1 milestone), implemented, done. Prompt-only change in `src/prompts.ts`:
one rule appended to the `REDUCE_PROMPT_HEADER` "Rules:" block — _prefer specific
over vague, drop descriptors that apply to most people, keep distinctive/rare
features over common, never pad a section to fit the template (omit it)_ — plus a
cadence nudge in "How To Imitate" (natural sentence-length/rhythm variation, avoid
uniform AI cadence). Directly targets the small-model regress-to-bland failure
mode that makes soul.md read as a generic "casual, warm, sarcastic" person.

Cross-link half dropped per the audit (no `ai-patterns.md` in repo; anti-tell
stripping lives in the external add-soul plugin). Effect is an unmeasured nudge —
verify via the eval harness (brief 05); the prompt-header hash is in the reduce
cache key (brief 01) so this invalidates only reduce. Backend typecheck clean.
Nothing committed.

## [2026-06-16] brief 14 — async extraction job model (done)

Promoted `async-extraction-job-model` to brief 14, implemented, verified end-to-end
against the live cloud backend, done. `POST /api/extract` is no longer a
multi-minute blocking request: a `jobs` table (with a partial-unique-index lock,
`status IN ('enqueued','running')`) replaces the in-memory `Set` — the lock now
survives restarts. The route creates the job, returns **202 + jobId in ~11ms**,
and runs the pipeline via `setImmediate`; `onProgress(stage, done, total)` threads
through `runOllamaPipeline → updateJobProgress`. `GET /api/results` surfaces a
`job` block (status/stage/chunk), new `GET /api/extract/:jobId` for polling. On
boot, `reclaimStaleJobs()` fails crashed jobs + rmSyncs their orphaned work dirs.
Frontend drives `running` from server state (mid-run reload resumes polling),
renders a real progress bar, reports the terminal outcome once.

Verified: build + typecheck:web clean; runtime — 401/400/202/409 guards, live
map→reduce→done with persisted soul.md + lock release, and boot reclamation
(seeded stale running job + orphan dir → flipped to failed + dir removed). Test
user + artifacts cleaned, DB left as found. Pre-ship fix: invalid
`bg-surface-sunken` class → real `bg-surface-highest` token (brief-05-class bug).
Clears the "/api/extract is synchronous" honest-limitation. Nothing committed.

## [2026-06-16] brief 15 — n-gram verbatim-overlap guard (done)

Promoted `ngram-verbatim-overlap-guard` to brief 15, implemented, verified, done.
New pure module `src/regurgitation.ts` (`findVerbatimOverlap`, 7-gram shingles,
lowercase/punctuation-stripped/NFC, language-agnostic, deterministic, no deps),
wired into `runOllamaPipeline` after the reduce: it compares the generated profile
against the raw chunk source (minus questionnaire `#`-scaffolding) and, on a hit,
**logs + warns but writes soul.md unchanged** — stripping risks mangling the voice
and the real safety net is gitignore + manual review (verbatim prevention is
necessary-but-not-sufficient per the research). Turns the soft 3×-repeated prompt
instruction into actual post-generation enforcement. Dropped NER per the audit.

Verified: 7/7 pure-logic checks (real leak caught, short catchphrase spared,
case/punct-insensitive, n-gram boundary, tokenizer, empty-safe); integration test
on a synthetic distinctive voice caught a GENUINE regurgitation — the reduce quoted
a ~15-word source sentence verbatim as a "signature line", warning fired, soul.md
written unchanged (leaked span confirmed present = log-only not strip). Backend
typecheck clean. Test user + artifacts cleaned, DB left as found. Nothing committed.

## [2026-06-16] briefs 16–19 — security-hardening cluster (done)

Promoted and shipped four S-effort security/hardening todos as briefs 16–19,
all verified at runtime, none committed.

- **16 session-secret prod guard** — `config.ts` exports `DEV_SESSION_SECRET`;
  `buildServer` throws in prod (exit 1, actionable msg) / warns in dev if the
  secret is still the dev default. `.env.example` notes the guard + the TLS
  requirement for prod `secure` cookies. CSRF dropped (SameSite=lax suffices).
- **17 expired-session sweep** — new `src/db/maintenance.ts`
  `sweepExpiredSessions()`, called on boot + hourly `.unref()` interval.
  **Verification caught a real bug:** the todo's assumed `expires_at <=
  datetime('now')` is wrong — `toISOString()`'s `T`/`Z` form string-sorts after
  SQLite's space-separated now, so expired rows read as valid. Fixed to
  `datetime(expires_at) <= datetime('now')`.
- **18 sanitize errors** — re-scoped: brief 14 already made extract async, so the
  raw-error leak now lands in the job `error` field, not a 500. `ollama.ts` throws
  typed `OllamaUnavailableError`/`OllamaRequestError` (raw cause in `cause`);
  `results.ts` `failureMessage()` + `eval.ts` map them to safe strings (503/502/
  generic). Verified: dead Ollama host → job shows "…not reachable…", raw
  ECONNREFUSED stays in the server log only.
- **19 register enumeration** — conflict body → generic "Could not create
  account." (409 kept). Rate-limit half deferred (gated on a real public deploy;
  localhost-bound + pragmatic auth = no live surface today).

Build + typecheck clean throughout. Test user/sessions cleaned, DB left as found.

## [2026-06-16] brief 20 — ollama preflight + timeout/retry + readiness gate (done)

Promoted `ollama-preflight-timeout-retry` to brief 20, all three slices shipped,
verified, done. (1) `generate()` now has per-request timeout (AbortSignal.timeout,
new OLLAMA_TIMEOUT_MS) + 3× retry-with-backoff on transient failure (network/5xx,
not 4xx). (2) `pingOllama()` preflight at the top of runUserExtraction fails fast
before any process/chunk work; reason surfaced via the sanitized job error. (3)
`GET /api/results` returns ollamaReady/ollamaReason (30s TTL + single-flight),
ResultsPage gates the Generate button + shows a Notice.

**Verification caught a real bug:** the model-membership check false-reported the
cloud model "not pulled" (ollama.com lists bare `gpt-oss:120b`, not our
`-cloud`-suffixed id; cloud models aren't pulled) — would have blocked ALL cloud
extraction. Fixed: skip membership when an API key is set (cloud); keep it for
local (no key) where /api/tags is authoritative. Integration-confirmed: live cloud
→ ready; dead host → preflight fails in 39ms with work_dir:null (before any work).

Build + both typechecks clean. Scratch tests + test user cleaned, DB left as found.

## [2026-06-16] briefs 21–25 — import/UX polish cluster (done)

Promoted and shipped five frontend-focused UX-polish todos as briefs 21–25, all
verified in-browser (Playwright, prod build), none committed.

- **21 soul.md Copy/Download** (Phase 1) — Copy + Download buttons + "review before
  sharing" hint on ResultsPage, acting on the displayed version. Phase-2 re-run
  diff deferred (noted in the brief).
- **22 upload per-file feedback** — client 5 MB preflight (MAX_BYTES mirrors the
  server cap) + per-file try/catch so one failure doesn't abort the batch + summary
  toast. Server stays authoritative.
- **23 persist language pref** — new `frontend/src/lang.ts` `useLangPref()`
  (localStorage, **default 'ro'** per the questionnaire design); StudyPage uses it.
  Verified: fresh login renders RO prompts. Skip-control half dropped (byte-identical
  to blank).
- **24 onboarding copy** — IntroPage step-01 ("11 open-ended prompts… take your
  time") + step-03 ("runs locally and needs a running Ollama server"). Copy only.
- **25 study depth guidance** — filled hintEn/hintRo for Q2–Q10 (data change);
  StudyPage word counter + non-blocking "a few more sentences would help" cue under
  ~25 words (checkmark NOT gated, per the dual-use-signal research stance) + bigger
  textarea + take-your-time placeholder. Verified: 5-word answer shows cue + count +
  still ✓; 35-word drops the cue.

Both typechecks + build clean throughout. Test user + playwright artifacts cleaned,
DB left as found.

## [2026-06-16] maintenance | prune stale already-shipped todos

The P1 briefs (01–07, 11, 12) were filed to `done/` but their source `todos/`
files were never removed, so `todos/` showed 8 already-shipped items as if open
(autosave, cache-fingerprint, deterministic-extraction, context-budget-truncation,
import-sender-diagnostics, name-normalization, reframe-prompts, style-card-eval).
Verified each against its 1:1 same-slug done brief, then removed all 8. `todos/`
now holds 12 genuinely-open items only. (Going forward, promote→build→done should
remove the todo at promote time, as 13–25 did.)

## [2026-06-16] done | accuracy cluster — briefs 26–28 (reduce-prompt gating, anti-padding, drift anchor)

Promoted and shipped the three small `prompts.ts`-centered accuracy todos as a
batch (the strongest spec-ready candidates with `briefs/todo/` empty):

- **26 gate-questionnaire-conditional-sections** — replaced the static
  `REDUCE_PROMPT_HEADER` const with `buildReducePrompt(hasQuestionnaire)`. The
  three questionnaire-only sections + the QA-vs-chat conflict rule are now
  interpolated only when a chunk has `kind === 'questionnaire'` (computed in
  `extract.ts` from the manifest). Stops `llama3.1:8b` hallucinating a core
  motivation/fear from a chat-only corpus. Within-questionnaire over-inclusion
  still rests on the model.
- **27 forbid-bullet-count-padding** — dropped the fixed "5-15" / "8-20" bullet
  counts in both map prompts for "Emit only well-supported observations — fewer
  is better… do NOT pad to a count." Thin corpora no longer get padded into
  invented voice.
- **28 drift-anchor-reinjection** — appended a `## Drift Anchor` section to the
  reduce prompt (compressed, re-pasteable restatement of How-To-Imitate, present
  for both corpus kinds) + a UI usage note in `ResultsPage.tsx` ("re-paste every
  dozen-or-so turns"). soul.md stays a clean artifact.

All three source todos removed at promote time. `SKILL.md` mirrors in the 26/28
todos were moot (file removed in brief 04). Both typechecks + `build:server`
clean. Effect is an unmeasured nudge — compare against the new reduce/map header
hashes next eval-harness (brief 05) run. Nothing committed. `todos/` now holds 9
genuinely-open items.

## [2026-06-16] done | brief 29 — Representative Samples section (short verbatim tokens only)

Shipped the conservative half of the deferred few-shot todo
(`representative-samples-fewshot`). Added a `## Representative Samples` section to
`buildReducePrompt` ([prompts.ts](../src/prompts.ts), after How To Imitate): 3-6
of the person's OWN short signature tokens (greetings/sign-offs/fillers/
catchphrases) quoted verbatim, under strict rules — only reuse tokens already in
the batches (no composing/paraphrasing/inventing excerpts), short fragments not
whole sentences, no identifying specifics, omit rather than pad. Appears for both
corpus kinds. Material already exists (map preserves verbatim tokens post brief 06).

**Scope was a user decision**: short verbatim tokens only, NOT full cross-register
sentence excerpts. Excerpts are the highest re-ID surface (deanonymization-2026:
79.2% style-only re-id) and the n-gram guard only *warns* today (doesn't filter),
so prose excerpts stay deferred until (a) an active n-gram filter exists and (b)
eval data shows the token version under-delivers. The +9% prose-with-few-shot
figure (prose-2025) is still inferred, not measured.

Both hard gates from the todo were satisfied at ship time: n-gram guard (brief 15)
+ eval harness that can A/B the +9% claim (brief 05) + map verbatim tokens (brief
06). Verified the n-gram-guard interaction needs no code change: DEFAULT_NGRAM=7,
the section emits few-word tokens, so intentional tokens don't trip false
regurgitation warnings while a runaway long verbatim run is still caught.

Both typechecks + build:server clean. Source todo removed at promote time. `todos/`
now holds 8 genuinely-open items. Nothing committed.

## [2026-06-16] done | brief 30 — map-prompt responsibility split + provenance-typed QA bullets

The todo's primary "first step" (narrow the chat-prompt values bullet — the one
true cross-prompt leak) was already shipped by brief 06: prompts.ts:15 reads
"Opinions/enthusiasms only as directly stated". Confirmed, no change. QA voice
bullets correctly left intact (dual-use signal).

Shipped the todo's *optional* half: provenance-typed QA bullets. MAP_PROMPT_HEADER_QA
now prefixes every bullet `in-prose:` (observed in how they wrote — strong) or
`self-described:` (what they claim — weaker self-report), pre-tagging voice bullets
in-prose and propositional bullets self-described. buildReducePrompt gains a gated
REDUCE_PROVENANCE_RULE: trust in-prose over self-described for observable style,
fold self-described into values/aspiration unless corroborated, strip the prefixes
from the final doc. Operationalizes the self-report-vs-observer gap (~5% variance).

Gating note: the new provenance rule is gated on hasQuestionnaire but independent
of the chat-vs-QA batch rule — it helps even in a questionnaire-only corpus.
Batch-level provenance already existed (extract.ts batch labels); this adds the
missing bullet-level granularity within QA batches.

Effect is an unmeasured nudge on small-model prefix adherence — eval-harness A/B
(brief 05) against the new QA+reduce header hashes should confirm. Both typechecks
+ build:server clean. Source todo removed at promote time. `todos/` now holds 7
genuinely-open items. Nothing committed.

## [2026-06-16] done | brief 31 — Q12 narrative high-point prompt

Pure data change. Appended Q12 (slug narrative-high-point) to questions.ts —
agentive/proud counterpart to Q4's low-point, same close-friend framing, RO+EN,
required. Added 'Q12' to the existing how-you-tell-it study right after Q4
(['Q4','Q12','Q5','Q6','Q7']). No file-format/migration change (Q\d+ regex +
MAP_PROMPT_HEADER_QA already accept higher ids); existing answer files lack the
section = treated as skip. Resolved the matching open-questions thread (second
targeted narrative prompt). Both typechecks + build:server clean. Source todo
removed. `todos/` now holds 6 items. Nothing committed.

## [2026-06-16] done | brief 32 — name self-vs-observed divergence

Reduce-prompt edit. Rewrote the `## Self-Perception vs. Observed Voice` body in
REDUCE_QA_SECTIONS from an abstract "describe the gap in 2-4 sentences" to a
concrete "list 1-3 SPECIFIC divergences (e.g. claims concise / runs long), then
default the imitator to the OBSERVED register." Stays orchestrator-gated on
hasQuestionnaire. Dropped (per the audit) the "~38%/~5% observer-advantage as a
blanket confidence weight" idea — wrong domain (trait inference, not style) and
would over-discount the questionnaire's own observed prose; the existing
conflict + provenance rules already weight at the right granularity.

NO cache invalidation — this is a reduce prompt; only map headers fingerprint
the .cache/bullets/ store, so it takes effect on the next extraction with zero
re-mapping (contrast briefs 27/30). SKILL.md "mirror" is moot (removed brief 04).
Unmeasured nudge; eval-harness A/B (brief 05) applies. Both typechecks +
build:server clean. Source todo removed. `todos/` now holds 5 items. Nothing
committed.

## [2026-06-16] done | brief 33 — honest token accounting + UTF-8 byte heuristic

Two no-dep fixes in the chunker. (1) chunk.ts now folds the per-chunk comment
header (CHUNK_HEADER_FIXED_TOKENS=48) and per-file `--- name ---` framing
(framingTokens()) into the packing budget, so the written chunk genuinely fits
num_ctx instead of spilling past it into the HEADER/OUTPUT reserve. Oversized
splitting sizes content against budget−header−framing. Manifest still reports
content tokens (matches the header's "Estimated tokens" line). (2) estimateTokens
switched from text.length/4 to Buffer.byteLength(utf8)/4 — BPE charges per byte,
so RO diacritics (2B) / emoji (4B) now cost their real budget; conservative
(larger) for non-ASCII, the safe direction vs silent truncation. ASCII unchanged.

Third todo half (raise default model off llama3.1:8b) DROPPED as obsolete —
decisions.md already locks the default to gpt-oss:120b-cloud (brief 08). No
decisions.md change. No cache-fingerprint field changed; byte heuristic may shift
chunk boundaries → legitimate re-map of changed chunks. Both typechecks +
build:server clean. Source todo removed. `todos/` now holds 4 items. Nothing
committed.

## [2026-06-16] decision+done | brief 34 — node:test golden tests (flips "no test runner")

First test infra. node:test + tsx loader (no new dep on Node 24). Added `npm
test` (runs src/**/*.test.ts) and `npm run typecheck:test` (tsconfig.test.json;
tsx strips types so tests get their own typecheck). Prod tsconfig now excludes
*.test.ts so build:server ships no test code to dist/. 12 tests, all green:
tokens (byte heuristic incl. brief-33 diacritic assertion), answers-file format
contract round-trip (write→parse, [skipped], QUESTIONS-order), and fs-coupled
processAll/chunkAll (voice filter, noise/dedup, continuation merge, questionnaire
isolation, and the whole-file-fits-budget check that proves brief 33 end-to-end).

DECISION: flips the locked "no test runner or linter — manual only" to
"node:test for the no-LLM data-prep core; no frontend runner, no linter"
(decisions.md updated). Dropped the todo's Vitest-for-frontend half (dep for
little value). Ollama I/O stays manual. npm test + both typechecks + build:server
clean. Source todo removed. `todos/` now holds 3 items. Nothing committed.

## [2026-06-16] decision+done | brief 35 — CI (build + typecheck + test)

Added .github/workflows/ci.yml — project's first CI. push-to-main + every PR:
Node 24 + npm ci, then npm run build (server tsc + web Vite build),
typecheck:web, typecheck:test, npm test. All four verified exit-0 locally. No
Ollama in CI (every gate is deterministic/offline). The todo's "don't add npm
test yet" caveat is now moot — brief 34 (landed just prior) added the scripts,
so this ships the full gate set, not the build-only reduced set. decisions.md
gains a "CI runs on GitHub Actions" entry (flips prior "no CI"). Source todo
removed. `todos/` now holds 2 items (both deferred: hierarchical-tree-reduce,
multi-platform-import-adapters). Nothing committed — workflow runs first on push.

## [2026-06-16] done | brief 36 — zero-recognized-lines import guard

Shipped the S half of the multi-platform-import-adapters todo (the L registry
half stays deferred). New NoRecognizedMessagesError in server/pipeline.ts, sibling
to NamesMismatchError: fires in runUserExtraction when conversations were imported,
questionnaireAnswers===0, and every perSource has parsedSenders.length===0 (no
WhatsApp line ever parsed → wrong format). Message points to WhatsApp export /
studies. Wired into failureMessage (routes/results.ts) so it passes through to the
user instead of the generic scrub. Questionnaire-only flows unaffected (guard
requires no questionnaire). Left the names-mismatch guard firing regardless of
questionnaire presence (a names problem is worth surfacing either way).

Test: pipeline.test.ts gains a processAll case pinning the ProcessStats trigger
signal (non-WhatsApp file → all parsedSenders empty). 13 tests pass; build:server
+ both typechecks clean. The multi-platform todo was TRIMMED (not removed) to the
deferred registry-only remainder. `todos/` now holds 2 items, both deferred
(hierarchical-tree-reduce, multi-platform-import-adapters registry). Nothing
committed.

## [2026-06-16] maintenance | backlog cleared to deferred-only

With briefs 31-36 done, every buildable P2/P3 candidate from the 2026-06-16
soul.md improvement backlog is shipped. The only open todos are two explicitly
DEFERRED items, each gated on a trigger that hasn't fired: hierarchical-tree-reduce
(a heavy user hitting the chunk ceiling — the assert-fail backstop already
prevents silent loss) and the multi-platform adapter registry (a real
second-format request — decisions.md locks WhatsApp-only). No work is ready to
promote.

## [2026-06-17] review | code hardening + doc-staleness sweep

Full project review (backend routes/auth/pipeline/stages, frontend, corpus). Code
was found well-engineered (scoped auth, no IDOR, sanitized errors, race-free job
lock); a few of the surfaced "high" findings were false positives that didn't
survive verification (chunk budget double-count — correct; work-dir leak on error
— the finally handles it). Four real, narrow improvements shipped:

1. Input bounds (DoS/storage): SaveBody answer body capped at 50k chars + array
   .max(100) (routes/studies.ts); NamesBody each name .max(200) + array .max(200)
   (routes/conversations.ts). Both were unbounded z.string()/z.array(z.string()).
2. routes/results.ts GET /api/extract/:jobId now guards Number.isInteger(jobId)
   → 400, mirroring the conversations delete guard (was NaN → silent 404).
3. frontend/api/client.ts: 30s AbortController timeout on all requests with a
   per-call override; runEval opts out (timeoutMs:0, multi-minute sync run).
4. stages/extract.ts map loop wraps extractChunk in try/catch and re-throws with
   chunk index + file + kind via { cause } — the job error log now names which of
   N chunks died instead of a context-free "fetch failed".

Verified: build:server + typecheck:web clean, 13 tests pass.

Doc-staleness fixes (corpus audit flagged drift, no code-logic gaps): rewrote
wiki/status.md (was pre-brief-04: claimed CLI / `/extract-soul` skill /
interview.ts / `npm run start` still existed) to API+frontend-only, re-stamped
2026-06-17. README "synchronous extraction" claim (×2: prose + Honest limitations)
updated to the async background-job model (brief 14). Removed the now-shipped
"does /api/extract need a job queue?" item from open-questions.md per its own
delete-on-ship rule. Nothing committed.

## [2026-06-17] done | brief 37 — choice trait studies + per-test reports

Added choice-based trait questionnaires alongside the free-text voice studies,
each producing a scored report folded (opt-in) into soul.md.

New question kind `choice` (scale | single) in questions.ts (Q13-Q45), grounded
in license-clean instruments: TIPI (Big Five), IPIP-HEXACO modesty + NN/g tone +
Tannen rapport/report, Kahler PCM frame, OEJTS (open-source MBTI — NOT
trademarked items). studies.ts gains a `band` ('voice'|'profile') + `reportKey`.

Choice answers persist in the UNCHANGED study_answers {id,title,body} contract:
answers-file.ts owns encode/decodeChoiceBody (`choice: N` + optional `note:`),
so answers.md / process.ts are untouched. New `reports` table (payload JSON +
include_in_soul) recomputed on each profile-study save. New scoring.ts is pure:
percentages (honest about midpoint flips), reverse-keying, MBTI 5==second-letter.

Routes: /api/studies exposes kind/choices/scale labels + band; /api/reports (GET)
and /api/reports/:key/include (POST toggle). Frontend: QuestionCard branches on
kind (scale track / radio list + optional say-more), ReportSection renders bars +
the include toggle. pipeline.ts renders included reports into a final reduce batch;
prompts.ts gains `hasProfile` rule weighting self-report BELOW observed voice
(honors the locked |ρ|≈.08 "no Likert for voice" finding). Freeform MAP prompt
sharpened toward speech patterns so conversations own voice, questionnaires own
traits.

MBTI reconciliation with the locked "do not score MBTI" decision: it scores and
shows a type, but include_in_soul defaults OFF — so by default it never reaches
soul.md (decision holds); the user opts in consciously, and its report carries a
retest-flip caveat.

Verified: build (server+web) clean, 22 node:test pass (9 new in scoring.test.ts).
Nothing committed.
