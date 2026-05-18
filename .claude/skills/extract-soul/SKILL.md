---
name: extract-soul
description: Orchestrates the map/reduce extraction of a my-soul.md voice profile from chunks/. Reads chunks/manifest.json, fans out one soul-chunk-extractor sub-agent per chunk in parallel, then synthesizes all returned bullets into out/my-soul.md. Use when the user says "extract soul", "build my-soul.md", "run the soul extraction", or "/extract-soul" after running `npm run start`.
---

# Extract Soul — orchestration skill

This skill runs the **Path A (Claude Code)** extraction flow described in the project README. It assumes the CLI has already produced `chunks/chunk-NNN.txt` files and `chunks/manifest.json`.

## When to use

- The user says "extract soul", "build my-soul.md", "run extraction", "/extract-soul", or asks you to turn the chunks into a voice profile.
- Skip if `chunks/manifest.json` does not exist — tell the user to run `npm run start` first.

## Steps

### 1. Sanity-check prerequisites

Read `chunks/manifest.json`. If it doesn't exist, stop and tell the user:

> No `chunks/manifest.json` found. Run `npm run start` first to produce the chunks.

If the manifest has zero chunks, stop and tell the user their `inputs/freeform/` either is empty or contains no messages matching `inputs/my-names.txt`.

### 2. Map step — fan out in parallel

For **each** chunk listed in `manifest.json.chunks`, spawn one `soul-chunk-extractor` sub-agent via the Agent tool.

**Issue all Agent calls in a single message** so they run concurrently. The harness practically caps real concurrency around 5–10 — that's fine; the rest queue and you wait. Do NOT call them sequentially.

Each sub-agent prompt should be a short instruction pointing at the chunk path, e.g.:

> Read `chunks/chunk-001.txt` and produce voice bullets per your system prompt.

Collect each sub-agent's bullet-list output. Keep them associated with the chunk file they came from.

### 3. Reduce step — synthesize

Once all map outputs are back, do the reduce yourself (no sub-agent — you have the full context). Build the final document using the REDUCE prompt structure defined in `src/prompts.ts` (`REDUCE_PROMPT_HEADER`). The expected output structure is:

```markdown
# My Soul

## Tone & Register
(2–4 sentences)

## Vocabulary & Signature Phrases
- ...

## Humor
(2–3 sentences, or "none observed")

## Recurring Topics & Interests
- ...

## Values & Worldview
- ...

## Stylistic Habits
- sentence length tendencies
- punctuation tendencies
- formatting habits
- emoji habits

## How To Imitate
A short paragraph giving an LLM concrete instructions to write as this person.
```

Reconcile contradictions across batches by noting context (e.g. "more formal with strangers, blunt with close friends") rather than picking one.

### 4. Write the file

Write the synthesized markdown to `out/my-soul.md` (create the directory if needed). End with a single newline.

### 5. Report

Tell the user:

- How many chunks were processed.
- Where the file was written.
- A one-line reminder that the file is gitignored and they should `cp out/my-soul.md` to the consumers (`../newspapper/soul.md`, the add-soul skill) after eyeballing it.

## Hard rules

- Do **not** quote verbatim sentences from any chunk content — paraphrase. LLMs occasionally regurgitate input; the user manually reviews `out/my-soul.md` before copying it, but you should avoid the obvious leak path.
- Do **not** invent observations the chunks don't support. If the corpus is small, the soul should honestly be sparse.
- Do **not** rewrite or modify any files under `inputs/`, `chunks/`, or `.cache/` — read only.
- One run = one output file. Overwrite `out/my-soul.md` if it exists.
