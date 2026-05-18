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
produces a single markdown file — `my-soul.md` — that describes your voice in
the way another LLM can actually use: tone, vocabulary, signature phrases,
humor style, recurring topics, values, and an explicit "how to imitate me"
section.

That file is then consumed by other projects:

- [newspapper](../newspapper/) — uses it to rewrite the day's news in your voice.
- The `add-soul` Claude Code skill — stamps any AI-generated text with your
  personality after a draft is written.

## Why a separate tool?

Voice profiles change rarely. Generating one is a slow, expensive,
once-in-a-while operation that has nothing to do with the projects that
_consume_ the profile. Keeping extraction in its own repo means:

- Your inputs (genuinely private or group chats) live in one gitignored place.
- Consumers depend on a tiny artifact (`my-soul.md`), not on raw exports.
- You can swap LLMs or extraction strategies without touching downstream code.

## How it works

The CLI is **pure data prep**. By default it does not call any LLM. It:

1. Parses WhatsApp exports from `inputs/freeform/`.
2. Filters to **your messages only** — the assistant's or other people's
   words aren't your voice and shouldn't pollute the profile.
3. Drops noise: short reactions (`ok`, `lol`, `👍`), URLs, `<Media omitted>`
   placeholders, duplicates.
4. Packs the cleaned messages into token-budgeted chunks under `chunks/`,
   each chunk labeled with its source files.

From there, you have two paths to turn the chunks into `my-soul.md`:

### Path A — Claude Code (primary)

In a Claude Code session, after running the CLI:

> Read `chunks/manifest.json`. For each chunk file, spawn a parallel
> sub-agent (issue all Agent calls in a single message) using the MAP prompt
> from `src/prompts.ts`. Collect each bullet list. Then synthesize all the
> bullets into `out/my-soul.md` using the REDUCE prompt from the same file.

### Path B — Local Ollama (fallback)

```
npm run start -- --ollama
```

Same map/reduce pipeline, but every call goes to the Ollama. Slower and
weaker than a hosted model, but fully offline and free. Per-chunk results
are cached by content hash under `.cache/bullets/`, so re-running after
adding one new export only processes the new chunks.

## Token-optimization strategy

Local Ollama doesn't charge per token, but it does charge in seconds — an 8B
model can be 10–60s per call. With a year of WhatsApp history you might have
500k–2M tokens. The pipeline applies five compounding optimizations before
anything hits the LLM:

1. **Filter to your messages only** — typically halves the input.
2. **Drop noise** — short messages, URLs, media placeholders. Another 20–40%
   off on real WhatsApp data.
3. **Deduplicate** — exact-match dedup. Cuts another 10–30% on chatty corpora
   full of "ok"s and "lol"s.
4. **Map-reduce with aggressive compression** — each ~30k-token chunk gets
   compressed to ~200 tokens of bullets, then a single synthesis call merges
   the bullets. ~100:1 compression at the map step.
5. **Content-hash cache** — re-running after adding new inputs only
   processes the new chunks.

## Privacy

Everything under `inputs/`, `inputs/processed/`, `chunks/`, `.cache/`, and
`out/` is gitignored. The CLI never publishes anything.

`out/my-soul.md` is **not** auto-copied to consumers. You eyeball it, then
move it manually:

LLMs can occasionally regurgitate verbatim phrases from their inputs. The
manual review step is the safety net.

## Setup

1. **Install:**

   ```
   npm install
   ```

2. **Configure:** copy `.env.example` to `.env` and adjust if needed.
   Defaults are sane.

3. **Tell it who you are:** create `inputs/my-names.txt` with one of your
   WhatsApp display names per line. You will appear under different names
   across different chats (whoever saved you under what nickname) — list
   them all.

   ```
   Gandolh
   Cristian
   ```

4. **Drop in inputs:** put WhatsApp exports (`.txt` or `.md`) into
   `inputs/freeform/`.

5. **Run:**
   ```
   npm run start
   ```
   This produces `chunks/`. Then either fan out via Claude Code or:
   ```
   npm run start -- --ollama
   ```

## Project layout

```
.env                  # configuration (validated with zod at startup)
inputs/
  my-names.txt        # your aliases across chats (gitignored)
  freeform/           # raw WhatsApp exports (gitignored)
  processed/          # your messages only, after filtering (gitignored)
chunks/
  chunk-NNN.txt       # token-budgeted batches (gitignored)
  manifest.json       # ordering, sources, token estimates
.cache/bullets/       # per-chunk Ollama outputs, hash-keyed (gitignored)
out/my-soul.md        # final profile (gitignored, manually copied out)

src/
  index.ts            # CLI entry point — orchestrates the two stages
  config.ts           # env + my-names loader, zod-validated
  tokens.ts           # cheap token estimator
  ollama.ts           # raw-fetch Ollama client
  prompts.ts          # MAP and REDUCE prompt headers
  stages/
    process.ts        # WhatsApp parse → filter → dedup
    chunk.ts          # file-bounded first-fit packing
    extract.ts        # Ollama map/reduce (fallback path)
```

## Honest limitations

- **Not headless.** The primary path requires you to be in a Claude Code
  session. There's no cron-friendly mode unless you use `--ollama`.
- **Not reproducible.** LLM stochasticity means two runs over the same
  chunks produce two different souls. That's inherent, not a bug.
- **WhatsApp-only on day one.** Adding new input formats means adding new
  parsers in `src/stages/process.ts`.
- **Romanian/English friendly** by default (chunking uses a ~4 chars/token
  heuristic that's accurate for both). Other languages may need a different
  estimator.

## Future work

- Skill that orchestrates the Claude/OpenAI or Gemini fan-out automatically.
- Incremental mode — only reprocess changed source files.
- More input formats: Telegram, journal entries, social-media post dumps.
- Optional stratified sampling for very large corpora.
