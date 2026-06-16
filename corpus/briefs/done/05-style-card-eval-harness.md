# Brief 05 — Style-card-vs-raw-text eval harness (`POST /api/eval`)

**Promoted from:** [todos/style-card-eval-harness.md](../../todos/style-card-eval-harness.md)
**Priority:** P1 · **Goal:** accuracy · **Impact:** high · **Effort:** M · **Captured:** 2026-06-16 · **Promoted:** 2026-06-16 · **Done:** 2026-06-16

## Outcome (2026-06-16)
Implemented in full.
- **[src/eval.ts](../../../src/eval.ts)** — pure, deterministic stylometric
  metrics (burstiness, sentence-length variance, type-token ratio, function-word
  L1 distance, char-distribution L1 distance) + `scoreAgainst(real, gen)` and
  `averageBundles`. No I/O, no deps.
- **[src/server/eval-run.ts](../../../src/server/eval-run.ts)** —
  `runUserEval(cfg, userId, {n,k})`: builds the holdout via a throwaway work-dir +
  `processAll` (same pattern as pipeline.ts, reuses `getNames` filter), loads the
  stored `soul.md`, generates a continuation per held-out prefix under conditions
  A/B/C, scores each against the real continuation, returns per-condition
  aggregates + per-sample breakdown. Generations cached by content-hash
  (kind=eval + model + ctx + temp + condition + prompt); temp 0 + fixed
  `EVAL_SEED=42` → deterministic. `NothingToEvalError` (no soul.md / no convos /
  too few usable messages) and `EvalBusyError` (per-user in-memory lock).
- **[src/server/routes/eval.ts](../../../src/server/routes/eval.ts)** +
  app.ts registration — `GET /api/eval` (running status), `POST /api/eval`
  (400/409/500 guards), `requireAuth` preHandler.
- **config.ts + .env.example** — `EVAL_HOLDOUT_N=8`, `EVAL_RAW_K=5`.
- **Frontend** — `EvalPage.tsx` (per-condition metric table with per-row winner
  highlight + win tally + expandable per-sample breakdown), `/eval` route, "Eval"
  nav link, `api.runEval`/`api.evalStatus` client methods + types.

Verified: `npm run build` + `npm run typecheck:web` clean. Runtime smoke test —
registered a fresh user, confirmed `GET /api/eval`→`{running:false}` (200),
`POST` with no soul.md → 400 with the actionable reason, unauthenticated POST →
401. The deep path (holdout build + A/B/C generation) needs a running Ollama +
real user data, not exercised here; the metrics are pure/deterministic and the
orchestration mirrors the proven pipeline.ts work-dir pattern. Fixed one bug
pre-ship: used a non-existent `border-border-subtle` Tailwind class → corrected
to the real `border-hairline` token (would have rendered borderless).

This completes the P1 foundation arc: 01 cache + 02 truncation + 03 determinism
made iteration honest; 04 collapsed to one surface; 05 makes the style-card bet
**measurable** — the project's headline claim now has an A/B signal. LLM-judge
layer remains deferred (optional).

## Why
The project's headline claim — a structured style card beats raw text examples
for imitation — has never been measured. With briefs 01–03 the Ollama path is now
honest (cache invalidates, no truncation, deterministic), so an A/B signal is
finally meaningful. This is the capstone of the P1 foundation: makes prompt/model
tuning measurable instead of blind. API + frontend only (no CLI — brief 04).

## Design decisions (grilled 2026-06-16)
- **Holdout source:** the user's `conversations` rows run through the SAME
  `process.ts` "your messages only" filter (via `getNames(userId)`), so held-out
  lines are genuinely the user's voice and match what extraction saw. Exclude the
  questionnaire.
- **Insufficient data → 400** with a clear reason: no stored `soul.md` (can't run
  condition A) or fewer than the minimum holdout messages. Mirror `/api/extract`'s
  guard style (`NothingToEvalError`).
- **Scope: configurable + richer.** Env/param-driven `N` (holdout samples) and `k`
  (raw examples for B/C); return both a per-condition aggregate table AND a
  per-sample breakdown. No LLM-judge in v1 (deferred, optional later).

## The three conditions (per held-out sample)
Take a prefix of a held-out message, generate a continuation under each:
- **A** = the user's stored `soul.md` spec only (from `results` table).
- **B** = `k` raw example messages only (drawn from the user's other real
  messages, disjoint from the holdout).
- **C** = spec + examples (the PROSE +9% spec+examples finding).

## Local metrics (deterministic, no deps, no model bias)
Score each generated continuation against the held-out real continuation:
burstiness, sentence-length variance, type-token ratio, and function-word /
char-distribution distance. Lower distance = closer to the real voice. Frame the
output as a **relative A/B regression signal** between prompt/temp/model changes,
NOT absolute fidelity (individual-Turing-test ceiling).

## Scope (the change)
1. **`src/eval.ts`** (shared, server-invoked — NOT under `stages/` since it isn't
   a pipeline stage): pure metric functions (burstiness, sentence-length variance,
   TTR, function-word/char-distribution distance) + a `scoreAgainst(real, gen)`
   that returns a metric bundle. No I/O, no Ollama — unit-reasoned in isolation.
2. **`src/server/eval-run.ts`**: `runUserEval(cfg, userId, {n, k})` — builds the
   holdout via a throwaway work dir + `processAll` (reuse the `pipeline.ts`
   work-dir pattern), loads the stored `soul.md`, runs A/B/C generations via
   `ollama.ts` `generate()` (temp 0 + `EXTRACTION_SEED` for determinism), scores
   each, returns `{conditions: {A,B,C: aggregate}, samples: [...]}`. Cache
   generations by content-hash (kind=`eval` + model + ctx + temp + condition +
   prompt + content), reusing the `.cache` pattern. Guards: `NothingToEvalError`
   (no soul.md / too few holdout), in-memory per-user lock like extraction.
3. **`src/server/routes/eval.ts`**: `POST /api/eval` (+ register in `app.ts`),
   `preHandler: requireAuth`. Body `{n?, k?}` clamped to sane bounds. 400 on
   `NothingToEvalError`, 409 if an eval is already running, 500 otherwise.
4. **Config:** `EVAL_HOLDOUT_N` (default 8) and `EVAL_RAW_K` (default 5) in
   `config.ts` + `.env.example`.
5. **Frontend:** an Eval view (route + nav entry) that POSTs `/api/eval`, shows a
   per-condition aggregate table (A/B/C × each metric) and an expandable
   per-sample breakdown. Reuse the Results page's loading/error affordances.

## Out of scope
- LLM-judge layer (optional, later).
- Async job model (separate P2 todo) — synchronous like `/api/extract`.
- Tuning the metric weights into a single score — report them side by side.

## Verify
- `npm run build` + `npm run typecheck:web` clean.
- `POST /api/eval` on a user with a stored `soul.md` + enough conversation
  messages returns the A/B/C table; a user missing either gets a 400 with the
  reason; a concurrent call gets 409.
- Determinism: same inputs + config → identical metric numbers across runs
  (temp 0 + fixed seed + content-hash cache).

## Refs
code: [server/pipeline.ts](../../../src/server/pipeline.ts), [server/routes/results.ts](../../../src/server/routes/results.ts), [ollama.ts](../../../src/ollama.ts), [stages/process.ts](../../../src/stages/process.ts), [db/repos.ts](../../../src/db/repos.ts), [config.ts](../../../src/config.ts) · corpus: [open-questions.md](../../wiki/open-questions.md), [style-card-artifact](../../wiki/concepts/style-card-artifact.md), [individual-turing-test-2026](../../wiki/sources/individual-turing-test-2026.md), [imitate-style-2025](../../wiki/sources/imitate-style-2025.md)
