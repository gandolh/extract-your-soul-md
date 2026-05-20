---
name: extract-soul
description: Orchestrates the map/reduce extraction of a my-soul.md voice profile from chunks/. Reads chunks/manifest.json, fans out one soul-chunk-extractor sub-agent per chunk in parallel, then synthesizes all returned bullets into out/my-soul.md. Handles both chat-log chunks and personality-questionnaire chunks. Use when the user says "extract soul", "build my-soul.md", "run the soul extraction", or "/extract-soul" after running `npm run start`.
---

# Extract Soul — orchestration skill

This skill runs the **Path A (Claude Code)** extraction flow described in the project README. It assumes the CLI has already produced `chunks/chunk-NNN.txt` files and `chunks/manifest.json`.

The pipeline supports two input shapes — chat logs and an open-ended personality questionnaire. Both are surfaced as chunks in `chunks/manifest.json` with a `kind` field of `freeform` or `questionnaire`. The skill handles either, both, or only one.

## When to use

- The user says "extract soul", "build my-soul.md", "run extraction", "/extract-soul", or asks you to turn the chunks into a voice profile.
- Skip if `chunks/manifest.json` does not exist — tell the user to run `npm run start` first (after dropping inputs into `inputs/freeform/` and/or running `npm run start -- --interview`).

## Steps

### 1. Sanity-check prerequisites

Read `chunks/manifest.json`. If it doesn't exist, stop and tell the user:

> No `chunks/manifest.json` found. Run `npm run start` first to produce the chunks.

If the manifest has zero chunks, stop and tell the user their `inputs/freeform/` is empty (no WhatsApp messages matching `inputs/my-names.txt`) AND they haven't run the questionnaire (`npm run start -- --interview`).

Inspect each chunk entry's `kind` field. The manifest can include any mix of `freeform` and `questionnaire` chunks.

### 2. Map step — fan out in parallel

For **each** chunk listed in `manifest.json.chunks`, spawn one `soul-chunk-extractor` sub-agent via the Agent tool. The agent's system prompt already handles both chunk kinds — you do not need to vary the instruction by kind.

**Issue all Agent calls in a single message** so they run concurrently. The harness practically caps real concurrency around 5–10 — that's fine; the rest queue and you wait. Do NOT call them sequentially.

Each sub-agent prompt should be a short instruction pointing at the chunk path, e.g.:

> Read `chunks/chunk-001.txt` and produce voice bullets per your system prompt.

Collect each sub-agent's bullet-list output. Keep them associated with the chunk file they came from AND with the chunk's `kind`.

### 3. Reduce step — synthesize

Once all map outputs are back, do the reduce yourself (no sub-agent — you have the full context). Build the final document using the REDUCE prompt structure defined in `src/prompts.ts` (`REDUCE_PROMPT_HEADER`).

Expected output structure:

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

## Core Motivation & Fears
(2–4 sentences — only include if the questionnaire batches supplied this.
Describe what they most want to be seen as and what they most fear being
seen as, and how that shapes their voice. Omit the section entirely if
not evident.)

## Communication Style
- whether they write more to connect or to inform, with any context-dependent flips
- how their register shifts across audiences (friend / colleague / stranger)
- dominant layer they lead with (facts / self-revelation / relationship / appeal)
- omit any sub-bullet not evident in the batches

## Self-Perception vs. Observed Voice
(2–4 sentences — only include if the questionnaire batches supplied this.
Describe how they'd LIKE to come across vs. how they actually write, and
which register a downstream LLM should imitate by default. Omit the
section entirely if not evident.)

## Stylistic Habits
- sentence length tendencies
- punctuation tendencies
- formatting habits
- emoji habits

## How To Imitate
A short paragraph giving an LLM concrete instructions to write as this person.
```

Reduce-step rules:

- Reconcile contradictions across batches by noting context (e.g. "more formal with strangers, blunt with close friends") rather than picking one.
- **When a questionnaire batch and a chat-log batch conflict**: the chat-log batch wins for observable style (vocabulary, punctuation, sentence rhythm); the questionnaire batch wins for values, beliefs, motivations, and aspirational register.
- The three questionnaire-conditional sections (`Core Motivation & Fears`, `Communication Style`, `Self-Perception vs. Observed Voice`) should only appear if the questionnaire batches actually surfaced material for them. Omit a section entirely rather than padding it.

### 4. Augment vs. create

Check if `out/my-soul.md` already exists.

- **If it does NOT exist**: write the synthesized markdown to `out/my-soul.md` (create the directory if needed). End with a single newline.
- **If it DOES exist**:
  1. First copy the existing file to `out/my-soul.prev.md` (overwriting any prior backup).
  2. Then overwrite `out/my-soul.md` with the new synthesis.
  3. The new synthesis is a fresh re-extraction from whatever chunks are present today, not a merge with the old text. The backup is the safety net.

### 5. Report

Tell the user:

- How many chunks were processed and the breakdown (e.g. "3 chat-log chunks + 1 questionnaire chunk").
- Where the file was written and whether a previous version was backed up to `out/my-soul.prev.md`.
- A one-line reminder that the file is gitignored and they should copy `out/my-soul.md` into whichever downstream tool consumes it after eyeballing the contents.

## Hard rules

- Do **not** quote verbatim sentences from any chunk content — paraphrase. LLMs occasionally regurgitate input; the user manually reviews `out/my-soul.md` before copying it, but you should avoid the obvious leak path.
- Do **not** invent observations the chunks don't support. If the corpus is small, the soul should honestly be sparse.
- Do **not** rewrite or modify any files under `inputs/`, `chunks/`, or `.cache/` — read only.
- One run = one output file. Back up the existing `out/my-soul.md` to `out/my-soul.prev.md` before overwriting.
