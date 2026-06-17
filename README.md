# extract-your-soul-md

> Turn your own private conversations into a static `my-soul.md` profile that
> teaches an LLM to write like _you_ — not like a generic AI.

## The idea

LLMs are great at sounding like a polite, neutral assistant. They're bad at
sounding like a specific human. If you want AI tools to produce text that
feels like it came from _you_ — your tone, your vocabulary, your humor, your
recurring opinions — you have to give them a reference for what "you" sounds
like.

This project builds that reference.

You feed it raw inputs (WhatsApp exports for now, more formats later) and it
produces a single markdown file — `soul.md` — that describes your voice in
the way another LLM can actually use: tone, vocabulary, signature phrases,
humor style, recurring topics, values, and an explicit "how to imitate me"
section.

That file can then be consumed by any downstream tool that needs a stable
voice reference — typically by inlining the markdown into an LLM prompt.

## What this is

A small **web platform**: a React SPA + a Fastify API + SQLite. It's a
psychological-study-style app — you register an account, answer a few themed
**studies** (open-ended self-report prompts), import your past conversations,
and generate your `soul.md`, all in the browser. It's multi-user, with a
local SQLite database as the source of truth.

```bash
npm install                 # needs Node >= 24
npm run dev                 # Fastify API (4317) + Vite SPA (5173)
# open http://localhost:5173, register, and go
```

Stack: React + Vite + [Base UI](https://base-ui.com), a Fastify API, and the
built-in `node:sqlite`. Extraction runs locally against
[Ollama](https://ollama.com).

For a single-port production build:

```bash
npm run build && npm run serve:prod   # http://localhost:4317
```

`serve:prod` serves both the SPA (static) and the API on one port. Set a real
`SESSION_SECRET` (see `.env.example`) for any non-local deployment.

## How to use it

1. **Start the platform** with `npm run dev` and open the Vite URL
   (http://localhost:5173).
2. **Register / log in.** Each user gets their own data and their own `soul.md`.
3. **Answer the studies.** The studies are themed forms of open-ended
   questions (the in-browser replacement for what used to be a terminal
   interview). They surface things chat logs can't see — values, beliefs,
   how you'd _like_ to write, the story you tell about yourself — and each
   free-text answer doubles as a voice sample in your own writing. You don't
   have to finish them all in one sitting; answers are saved as you go.
4. **Import your conversations.** Upload WhatsApp exports (`.txt` / `.md`) and
   set the display names that mark **you** across those chats. You appear
   under different names in different chats (whoever saved you under what
   nickname) — list them all. These names live in SQLite, per user.
5. **Generate your soul.** From the Results page, kick off extraction (this
   calls `POST /api/extract`). The result is stored for your account and
   rendered on the Results page.

Either source is enough on its own — studies alone, conversations alone, or
both combined.

## Why a separate tool?

Voice profiles change rarely. Generating one is a slow, expensive,
once-in-a-while operation that has nothing to do with the projects that
_consume_ the profile. Keeping extraction in its own tool means:

- Your inputs (genuinely private or group chats) live in one place, never
  committed to git.
- Consumers depend on a tiny artifact (`soul.md`), not on raw exports.
- You can swap LLMs or extraction strategies without touching downstream code.

## How it works

When you hit extract, the server runs a **pure data-prep pipeline** over
_your_ data, then a map/reduce pass against Ollama:

1. **Process** — parses your imported WhatsApp exports and filters to **your
   messages only** (matched against the display names you set). Other people's
   words aren't your voice and shouldn't pollute the profile. It also drops
   noise (short reactions like `ok` / `lol` / `👍`, URLs, `<Media omitted>`
   placeholders, exact duplicates) and folds in your study answers.
2. **Chunk** — packs the cleaned messages and answers into token-budgeted
   chunks, each labeled with its source and `kind` (`freeform` or
   `questionnaire`). The study answers always get their own chunk so they
   aren't cross-contaminated with chat fragments.
3. **Extract** — a map/reduce flow against your local Ollama server. Each
   chunk is compressed to a handful of voice bullets (the questionnaire chunk
   uses a different map prompt that pulls out propositional content — beliefs,
   motivations, narrative arcs), then a single reduce call synthesizes all the
   bullets into your `soul.md`.

This all happens in a throwaway per-user work directory built from your
database rows, which is deleted afterward. The result is written back to your
account and shown on the Results page (the previous version is kept as a
backup).

Extraction runs as a **background job** — a full Ollama run can take minutes,
especially with a long chat history, so `POST /api/extract` returns immediately
with a job id and the Results page polls for progress (map/reduce stage + chunk
count) until it finishes. A local Ollama server must be running for it to work.

### Why a questionnaire at all?

Chat logs capture observable style — vocabulary, punctuation, sentence
rhythm, humor that comes up in conversation. They miss:

- Values and beliefs you don't argue about in chats.
- Topics of deep interest you have no one to message about.
- Aspirational register — how you'd _like_ to write vs. how you actually do.
- Narrative-identity arc — the shape of the story you tell about yourself.

The themed studies fill those gaps. The research foundation for the question
set lives in the project **corpus** ([corpus/](corpus/)) — see
[corpus/wiki/sources-raw/02-questionnaire-design.md](corpus/wiki/sources-raw/02-questionnaire-design.md)
for per-question rationale and
[corpus/wiki/sources-raw/01-research-synthesis.md](corpus/wiki/sources-raw/01-research-synthesis.md)
for the framework evaluation that led to the minimum set. That research is
also compiled into an interlinked **LLM Wiki** at
[corpus/wiki/](corpus/wiki/) — start at
[corpus/wiki/overview.md](corpus/wiki/overview.md).

## Token-optimization strategy

Local Ollama doesn't charge per token, but it does charge in seconds — an 8B
model can be 10–60s per call. With a year of WhatsApp history you might have
500k–2M tokens. The pipeline applies four compounding optimizations before
anything hits the LLM:

1. **Filter to your messages only** — typically halves the input.
2. **Drop noise** — short messages, URLs, media placeholders. Another 20–40%
   off on real WhatsApp data.
3. **Deduplicate** — exact-match dedup. Cuts another 10–30% on chatty corpora
   full of "ok"s and "lol"s.
4. **Map-reduce with aggressive compression** — each ~30k-token chunk gets
   compressed to ~200 tokens of bullets, then a single synthesis call merges
   the bullets. ~100:1 compression at the map step.

## Privacy

The SQLite database (`data/`) and all per-user scratch (`.work/`) are
gitignored, along with any `inputs/`, `chunks/`, `.cache/`, and `out/`
working directories. Nothing is published anywhere — the platform runs
locally, and extraction runs against your local Ollama.

Your generated `soul.md` is meant to be **eyeballed before you use it**
downstream. LLMs can occasionally regurgitate verbatim phrases from their
inputs; the manual review step is the safety net.

## Project layout

```
.env                       # configuration (validated with zod at startup)
data/
  soul.sqlite              # the source of truth (gitignored, WAL)
.work/                     # per-user throwaway extraction scratch (gitignored)

src/
  index.ts                 # server entry point
  config.ts                # env loader, zod-validated
  tokens.ts                # cheap token estimator
  ollama.ts                # raw-fetch Ollama client
  prompts.ts               # MAP, MAP_QA, and REDUCE prompt headers
  questions.ts             # the canonical questionnaire questions (RO + EN)
  studies.ts               # themed grouping of questions into studies
  answers-file.ts          # shared answers.md reader/writer
  color.ts                 # tiny ANSI helper (util.styleText, no deps)
  stages/
    process.ts             # WhatsApp parse → filter → dedup + Q&A parser
    chunk.ts               # file-bounded first-fit packing; isolates Q&A chunk
    extract.ts             # Ollama map/reduce
  db/
    schema.sql             # tables, applied idempotently on boot
    db.ts                  # node:sqlite singleton
    repos.ts               # synchronous prepared-statement DAL
  server/
    app.ts                 # builds Fastify (cookies, routes, prod static SPA)
    serve.ts               # listens
    auth.ts                # scrypt hashing + cookie sessions + requireAuth
    pipeline.ts            # per-user extraction (process → chunk → Ollama)
    routes/                # auth, studies, conversations, results

frontend/
  index.html
  vite.config.ts           # proxies /api → 4317 in dev; builds to dist/public
  tsconfig.json            # own DOM/react-jsx config, separate from backend
  src/
    main.tsx, App.tsx
    auth/AuthContext.tsx
    api/client.ts
    components/            # Layout, Markdown, Toaster, ui
    pages/                 # Login, Register, Intro, Studies, Study, Import, Results

corpus/                    # LLM-maintained wiki + work tracker — see corpus/index.md
```

## Honest limitations

- **Ollama-only.** A local Ollama server has to be running. Slower and weaker
  than a hosted model, but fully offline and free.
- **Single-process job runner.** `/api/extract` runs as a background job
  (DB-backed, one live job per user, reclaimed on restart) via `setImmediate` —
  not an external queue. That matches the local-Ollama single-box reality; it
  would need a real queue to scale past one machine.
- **`node:sqlite` is experimental.** It needs Node ≥ 24, and the server
  suppresses the experimental warning. Swapping to `better-sqlite3` later is
  mechanical (same API surface).
- **Pragmatic auth.** Username/password with scrypt hashing and cookie
  sessions. Set a real `SESSION_SECRET` and run behind TLS for anything
  non-local.
- **Not reproducible.** LLM stochasticity means two runs over the same data
  produce two different souls. That's inherent, not a bug.
- **WhatsApp-only on day one.** Adding new input formats means adding new
  parsers in `src/stages/process.ts`.
- **Romanian/English friendly** by default (chunking uses a ~4 chars/token
  heuristic that's accurate for both). Other languages may need a different
  estimator.

## Future work

- A job queue + polling so extraction isn't a blocking HTTP request.
- Incremental mode — only reprocess changed source data.
- More input formats: Telegram, journal entries, social-media post dumps.
- Optional stratified sampling for very large corpora.
- More themed studies (data-only: add questions to `src/questions.ts` and a
  `Study` entry to `src/studies.ts`).
