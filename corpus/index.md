# Corpus index

The front door to the `extract-your-soul-md` corpus — the project's
LLM-maintained wiki + work tracker. Read [CLAUDE.md](CLAUDE.md) for how this
corpus is maintained; [log.md](log.md) for its history.

## Work lifecycle

- [todos/](todos/) — captured ideas/tasks as prose, pre-spec. **soul.md
  improvement backlog captured 2026-06-16** (originally P1×8 / P2×16 / P3×9 after
  deleting the obsolete `single-source-reduce-template`). **All P1s are now
  done** (shipped as briefs 01–12), plus P2/P3 briefs 13 (anti-generic guard),
  14 (async job model), 15 (n-gram regurgitation guard), and the security cluster
  16–19 (session-secret guard, session sweep, sanitized errors, register
  enumeration), 20 (ollama preflight/timeout/retry/readiness), the import/UX
  polish cluster 21–25 (soul.md copy/download, per-file upload feedback, language
  persistence, onboarding copy, study depth guidance), and the accuracy cluster
  26–28 (orchestrator-gated questionnaire reduce sections, anti-bullet-padding,
  drift-anchor re-injection), and 29 (Representative Samples section — short
  verbatim tokens only; full sentence excerpts stay deferred over re-ID risk),
  and 30 (map-prompt responsibility split + provenance-typed QA bullets), 31
  (q12 narrative high-point study), 32 (name concrete self-vs-observed
  divergences in the reduce prompt), 33 (honest token accounting — chunk
  framing folded into the budget + UTF-8-byte estimate), and 34 (node:test
  golden tests for the no-LLM data-prep core — flips the "no test runner"
  decision), 35 (GitHub Actions CI — build + typecheck + test), and 36
  (zero-recognized-lines import guard). **The buildable backlog is now clear** —
  every P2/P3 candidate captured 2026-06-16 is shipped. Only **deferred** work
  remains, each gated on a trigger that hasn't fired: hierarchical tree-reduce
  (a heavy user hitting the chunk ceiling), the multi-platform import-adapter
  registry (a real second-format request — only its zero-lines guard shipped, as
  brief 36), full Representative-Samples sentence excerpts (needs an active
  n-gram filter + eval data), the soul.md re-run **diff** (brief 21 Phase 2), and
  auth rate-limiting (gated on a real public deploy).
- [briefs/todo/](briefs/todo/) — numbered work specs ready to build.
- [briefs/done/](briefs/done/) — completed specs (immutable, with outcome notes).
  01 cache-fingerprint · 02 truncation · 03 determinism · 04 collapse-to-API ·
  05 eval-harness · 06 reframe-prompts · 07 name-normalization · 08 ollama-cloud ·
  09 empty-json-body · 10 bump-num-ctx · 11 import-diagnostics · 12 autosave ·
  13 anti-generic-reduce-guard · 14 async-extraction-job-model ·
  15 ngram-verbatim-overlap-guard · 16 session-secret-prod-guard ·
  17 expired-session-sweep · 18 sanitize-extract-error-responses ·
  19 register-enumeration · 20 ollama-preflight-timeout-retry ·
  21 soulmd-copy-download · 22 upload-per-file-feedback ·
  23 persist-language-preference · 24 onboarding-expectations-copy ·
  25 study-depth-guidance · 26 gate-questionnaire-conditional-sections ·
  27 forbid-bullet-count-padding · 28 drift-anchor-reinjection ·
  29 representative-samples-section · 30 map-prompt-responsibility-split ·
  31 q12-narrative-high-point · 32 name-self-vs-observed-divergence ·
  33 honest-token-accounting · 34 node-test-golden-tests ·
  35 ci-typecheck-build · 36 zero-recognized-lines-guard.
- [briefs/superseded/](briefs/superseded/) — specs later undone/replaced.
- [log.md](log.md) — chronological record of every meaningful corpus change.

## Wiki — project state (the corpus-flow spine)

- [wiki/status.md](wiki/status.md) — dated snapshot of where the project stands.
- [wiki/architecture.md](wiki/architecture.md) — structural map of the codebase
  (CLI core + web platform over a shared pipeline).
- [wiki/decisions.md](wiki/decisions.md) — locked tech/design choices.
- [wiki/open-questions.md](wiki/open-questions.md) — genuinely unresolved threads.

## Wiki — research & design (the migrated LLM Wiki)

The research behind the questionnaire path and voice imitation. Start here:

- [wiki/overview.md](wiki/overview.md) — the thesis: build input for *voice
  imitation*, not a personality report.
- [wiki/index.md](wiki/index.md) — the full research-wiki catalog (frameworks,
  concepts, source summaries).
- [wiki/sources-raw/](wiki/sources-raw/) — the immutable raw design docs:
  research synthesis, questionnaire design, integration plan, references, plus
  the web-UI design brief and design tokens.

## Where else knowledge lives

- The root [CLAUDE.md](../CLAUDE.md) owns pipeline mechanics and run commands.
- The code under [src/](../src/) and [frontend/](../frontend/) is the ultimate
  source of truth (it wins over any wiki claim — verify before quoting).
