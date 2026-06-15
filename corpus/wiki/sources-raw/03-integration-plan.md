# Integration Plan

How the questionnaire path slots into the existing pipeline, the
file-by-file change list, and the resume-this-later checklist.

See [02-questionnaire-design.md](02-questionnaire-design.md) for the
question set and the REPL UX spec.

## Existing flow

Current pipeline as implemented in [src/index.ts](../../../src/index.ts):

```
inputs/freeform/        WhatsApp exports (.txt / .md)
       ↓
   process.ts           Parse → filter to user's messages → drop noise → dedup
       ↓
inputs/processed/       Cleaned per-source files (user's messages only)
       ↓
   chunk.ts             File-bounded first-fit packing to ~30k-token chunks
       ↓
chunks/                 chunk-NNN.txt + manifest.json
       ↓
   ┌────────────────┬──────────────────┐
   ↓                ↓                  ↓
Path A (Claude)  Path B (--ollama)    (no extraction yet)
/extract-soul    extract.ts
   ↓                ↓
out/my-soul.md   out/my-soul.md
```

## New flow

```
inputs/freeform/            (existing)        inputs/questionnaire/
                                                     ↓
                                             interview.ts (REPL)
                                                     ↓
                                              answers.md
       ↓                                              ↓
   process.ts (with Q&A parser added)  ────────┘
       ↓
inputs/processed/   ← chat logs AND questionnaire answers
       ↓
   chunk.ts        ← unchanged; answers fit in their own chunk
       ↓
chunks/            ← may include a questionnaire chunk
       ↓
/extract-soul (extended to handle Q&A-flavored chunks differently)
       ↓
out/my-soul.md     (created if missing; augmented if exists)
```

Key property: the questionnaire is **another input source**, not a
separate pipeline. The existing process → chunk → extract machinery
handles it after small parser and prompt extensions.

## File-by-file changes

### NEW: `src/questions.ts`

The question set as typed data. See
[02-questionnaire-design.md](02-questionnaire-design.md#question-source-of-truth)
for the type signature. ~80 lines.

### NEW: `src/stages/interview.ts`

The REPL. Responsibilities:

- Read `QUESTIONS` from `src/questions.ts`.
- Detect partial `inputs/questionnaire/answers.md`; offer resume.
- For each question: render prompt, read multi-line input, handle
  `:skip` / `:back` / `:quit` / `:done`.
- Append-on-answer to `inputs/questionnaire/answers.md` (crash-safe).
- On `:quit` or completion, print a summary and the next-step
  instruction ("run `/extract-soul` in Claude Code or `npm run start --
  --ollama`").

Implementation notes:

- Node `readline` is enough; no need for `inquirer` or `prompts`.
- For multi-line input, use `rl.on('line', ...)` and accumulate until an
  empty line. Commands (`:skip` etc.) are detected as exact matches on a
  single line and short-circuit the accumulator.
- Use `chalk` (already in dependencies) for the dim-color hint and the
  progress indicator.

### MODIFY: `src/index.ts`

Add `--interview` to `parseFlags`:

```ts
function parseFlags(argv: string[]): {
  ollama: boolean;
  interview: boolean;
} {
  return {
    ollama: argv.includes('--ollama'),
    interview: argv.includes('--interview'),
  };
}
```

In `main()`: if `flags.interview`, short-circuit into the interview and
exit. The interview does not run the process / chunk stages — those run
on the next `npm run start` after the user finishes.

Rationale for short-circuiting: the user might run the interview today
and add more WhatsApp exports tomorrow; conflating the two stages causes
confusion. Keep them composable.

### MODIFY: `src/stages/process.ts`

Add a Q&A parser. Detection: file is `inputs/questionnaire/answers.md`
(or matches a glob) → use Q&A parsing instead of WhatsApp parsing.

Q&A parsing:

- Markdown headings starting with `## Q` are question markers.
- The text between one heading and the next is the answer.
- If the answer body is `[skipped]` (case-insensitive, trimmed), drop
  that Q.
- All non-skipped answers become "user's messages" in the processed file,
  joined with double-newline separators.

Output: `inputs/processed/questionnaire.txt` (or whatever naming
convention matches the existing WhatsApp output naming).

### MODIFY: `src/stages/chunk.ts`

No changes expected. The questionnaire-processed file is just another
input to the first-fit packer. It will typically be small enough to fit
in one chunk on its own.

### MODIFY: `src/prompts.ts`

Two changes:

1. Add a second map prompt variant `MAP_PROMPT_HEADER_QA` optimized for
   Q&A input. The chat-log map prompt is tuned for fragmentary messages;
   the Q&A map prompt should expect long-form explanatory answers and
   should extract:
   - Propositional content (values, beliefs, narrative arcs).
   - Voice characteristics from the *explanatory* register the user uses
     when answering questions (which is a distinct register from chat).
   - Aspirational vs. actual voice gap (Q8) as an explicit named output.

2. Extend `REDUCE_PROMPT_HEADER` with new output sections:
   - `## Core Motivation & Fears` (from Q9 + Q4).
   - `## Communication Style` (from Q5 + Q6 + Q7).
   - `## Self-Perception vs. Observed Voice` (from Q8).
   - Existing `## Values & Worldview` is enriched with Q2 + Q3.
   - Existing `## Recurring Topics & Interests` is enriched with Q2.

### MODIFY: `.claude/skills/extract-soul/SKILL.md`

Extend the skill to:

1. Check for `inputs/questionnaire/answers.md` (or the processed /
   chunked questionnaire artifact, depending on where in the pipeline the
   skill is reading from — TBD during implementation).
2. If present, use the Q&A map prompt for that chunk specifically.
3. Read the existing `out/my-soul.md` if present.
4. Reduce step: if a prior `my-soul.md` exists, produce an augmented
   version (keep the observed-voice sections, refine values + worldview,
   add the new sections). Back up the previous version to
   `out/my-soul.prev.md` before writing.

The existing skill assumes only chunks/manifest.json as input. The
extended skill needs to handle three cases:

| Chat logs? | Questionnaire? | Existing soul? | Behavior |
|---|---|---|---|
| Yes | No | No | Original behavior (unchanged). |
| Yes | No | Yes | Re-extract from logs, replace existing. |
| No | Yes | No | Create soul from questionnaire alone. |
| No | Yes | Yes | Augment existing soul with questionnaire-derived sections. |
| Yes | Yes | No | Full extraction from both. |
| Yes | Yes | Yes | Re-extract from both, replace existing. |

Always back up the existing file before overwriting.

### MODIFY: `src/config.ts`

Add config entries for the questionnaire path:

```ts
INPUTS_QUESTIONNAIRE_DIR: z.string().min(1).default('inputs/questionnaire'),
QUESTIONNAIRE_FILE: z.string().min(1).default('answers.md'),
```

Add corresponding fields to `Config` and `loadConfig`.

### MODIFY: `.gitignore`

Already ignores all of `inputs/`, so questionnaire files are covered.
Verify no exception is needed.

### MODIFY: `README.md`

Add a section after "How it works":

> ### Optional: questionnaire path
>
> Chat logs capture observable style. They miss values, beliefs,
> narrative identity, and the gap between how you write and how you'd
> like to write. To fill those gaps:
>
> ```
> npm run start -- --interview
> ```
>
> Walks you through 10 open-ended questions (~20 min). Answers save to
> `inputs/questionnaire/answers.md`. Then re-run `npm run start` to
> include them in the next extraction.

### MODIFY: `CLAUDE.md`

Update the architecture section to mention the new input source and
the extended skill behavior.

## Implementation order

For resuming this work:

1. **`src/questions.ts`** — the question data. Stand-alone, no
   dependencies on other new code. Write this first because the wording
   needs human review (Romanian translations especially).
2. **`src/stages/interview.ts`** — the REPL. Can be built and tested
   in isolation by running it standalone; doesn't need extract changes
   yet. Test by completing a fake interview and inspecting the resulting
   `answers.md`.
3. **`--interview` flag in `src/index.ts`** — wire it up.
4. **Q&A parser in `src/stages/process.ts`** — extend the processor.
   Test by running `npm run start` after the interview and inspecting
   `inputs/processed/`.
5. **`MAP_PROMPT_HEADER_QA` and reduce extensions in `src/prompts.ts`**.
6. **Update `.claude/skills/extract-soul/SKILL.md`** to handle the new
   chunk types and the augment-vs-create logic.
7. **Doc updates** in `README.md` and `CLAUDE.md`.
8. **Optionally extend Ollama path** in `src/stages/extract.ts` to use
   the new prompt variants. (Lower priority; Path A is the primary.)

Each step is independently testable. Stop after step 3 to have a working
interview that just writes a file the user can read.

## Open questions for the implementer

These were left unresolved in the design conversation and should be
decided during implementation, but the design as written assumes the
defaults below:

- **Where does the skill read the questionnaire — pre-chunked
  (`inputs/questionnaire/answers.md`) or post-chunked (one of
  `chunks/chunk-NNN.txt`)?**
  Default assumption: post-chunked, because it reuses the existing
  fan-out machinery without special-casing the file path.
  Alternative: pre-chunked, if the questionnaire warrants a different
  prompt entirely and we want to bypass the chunker. Decide based on
  what feels less surgical when implementing.
- **Downstream consumers of `out/my-soul.md`**: adding new sections may
  or may not break them. Before changing the output contract, verify how
  any downstream tools read the file. If they consume it permissively
  (just feed it to an LLM as context), new sections are fine. If they
  parse specific section headers, the contract is more brittle and we
  need to be careful.
- **Backup naming**: `out/my-soul.prev.md` or timestamped
  `out/my-soul.2026-05-20.md`? Default: `.prev.md` (simpler, only one
  backup deep).
- **Language flag**: `--interview --en` to flip to English-primary, or
  show both languages side by side always? Default: show both, dim color
  for the secondary language.

## Testing

The base project has no test runner. Manual testing plan:

1. Run `npm run start -- --interview`, complete 2–3 questions, Ctrl+C.
   Verify `answers.md` has 2–3 sections.
2. Re-run `npm run start -- --interview`. Verify it offers resume and
   picks up at Q3 (or wherever).
3. Complete the full interview. Verify `answers.md` has 10 sections.
4. Run `npm run start` (no flag). Verify `inputs/processed/` now contains
   a questionnaire-derived file, and `chunks/` includes it in the
   manifest.
5. In Claude Code, run `/extract-soul`. Verify `out/my-soul.md` is
   created with the new sections populated from the questionnaire.
6. Re-run `/extract-soul` with an existing `out/my-soul.md` present.
   Verify it backs up to `my-soul.prev.md` and produces a sensible
   augmented version.

Add a `npm` test runner only if and when manual testing becomes a
bottleneck.
