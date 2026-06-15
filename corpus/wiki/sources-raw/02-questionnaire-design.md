# Questionnaire Design

The 10+1 question set, the REPL UX spec, and the `answers.md` file format.

See [01-research-synthesis.md](01-research-synthesis.md) for *why* this
particular shape; this file is the *what*.

## Design principles

1. **All open-ended, no Likert.** Every answer is dual-use — trait signal
   AND voice sample.
2. **Minimum sufficient set.** Drop any question whose dimension is also
   captured by another, lower-cost question.
3. **Ordered warm-up → vulnerable → meta.** Frustration first (easy,
   loosens the keyboard), self-perception and core-fear later (need trust
   built up).
4. **Romanian primary, English alongside.** The user's natural writing
   language is Romanian; the English version exists for review and for
   downstream LLMs that may prefer it.
5. **Probe text included.** Each question has a short follow-up hint in
   parentheses, shown in dimmer color in the REPL. Helps when the bare
   prompt feels too abstract.

## The 10 + 1 questions

For each question: the English wording, a draft Romanian translation, the
psychological mechanism it probes, and why it earned its slot in the
minimum set.

### Q1 — Recurring frustration

**EN**: "Describe a recurring frustration in your life — vent it like you
would to a close friend."

**RO**: "Descrie o frustrare care îți revine constant în viață — varsă-ți
năduful ca în fața unui prieten apropiat."

**Probes**: Neuroticism signal (negative emotion words, first-person
singular density per Pennebaker), the user's actual frustration-voice,
informal register baseline.

**Why kept**: Loosens the keyboard, produces immediate voice sample,
catches the user in their natural venting tone rather than their composed
self-presentation tone.

### Q2 — Hidden passion

**EN**: "Tell me about something you're passionate about that few people
around you share. Why does it matter?"

**RO**: "Povestește-mi despre ceva care te pasionează și nu prea
împărtășesc cei din jur. De ce contează pentru tine?"

**Probes**: Topics the chat logs cannot see (because the user has no one
to message about them). Openness facets (Ideas, Aesthetics). The "why"
adds value-framing.

**Why kept**: Direct fill for one of the largest chat-log blind spots.

### Q3 — Belief asymmetry

**EN**: "What's a belief you hold that most people around you don't? You
don't have to defend it."

**RO**: "Care e o convingere pe care o ai, dar pe care majoritatea celor
din jur nu o împărtășesc? Nu trebuie să o aperi."

**Probes**: Values invisible to chats. HEXACO Honesty-Humility texture
(does the user frame the belief with modesty or with status-signaling?).
Openness facet (Values).

**Why kept**: Surfaces dimensions Big Five collapses; the "you don't have
to defend it" framing reduces defensive hedging.

### Q4 — Narrative identity

**EN**: "Tell me about a time something went wrong and what came of it.
Write it the way you'd tell a close friend."

**RO**: "Povestește o dată când ceva a mers prost și ce a ieșit până la
urmă. Scrie ca și cum i-ai povesti unui prieten apropiat."

**Probes**: McAdams redemption vs. contamination narrative arc.
Agentive vs. passive sentence construction. How the user constructs
meaning from adversity.

**Why kept**: This is the single highest-leverage prompt in the research.
Predicts global voice characteristics, not just the answer's contents.

### Q5 — Code-switching range

**EN**: "How would you describe how you write differently to: (a) a close
friend, (b) a colleague at work, (c) a stranger you're being polite to?"

**RO**: "Cum scrii diferit cu: (a) un prieten apropiat, (b) un coleg de la
muncă, (c) un necunoscut căruia trebuie să-i fii politicos?"

**Probes**: Tannen's register-shifting. Captures the *range* of voices the
user maintains, which is critical for the downstream LLM to know which
register to imitate in which context.

**Why kept**: Chat logs typically come from one or two registers; this
question explicitly maps the others.

### Q6 — Rapport vs. report

**EN**: "When you write, are you more often trying to connect with someone
or to inform them? Are there contexts where this flips?"

**RO**: "Când scrii, încerci mai des să te conectezi cu cineva sau să-l
informezi? Sunt contexte în care lucrurile se inversează?"

**Probes**: Tannen's rapport / report axis. Schulz von Thun's dominant
layer (relationship vs. content). Predicts question density and hedging
frequency.

**Why kept**: One question, two frameworks worth of signal.

### Q7 — Humor style

**EN**: "Your humor — when it shows up, what flavor is it? Examples
welcome."

**RO**: "Umorul tău — când apare, ce aromă are? Exemple sunt binevenite."

**Probes**: Self-reported humor type, with example writing in that humor
style. Self-reported humor diverges from actual humor more than any other
self-perception, so the *examples* are the more important part of the
answer.

**Why kept**: Chat logs catch in-the-wild humor; this question catches
how the user thinks of their own humor (often differently).

### Q8 — Self-perception gap

**EN**: "How would you LIKE to come across in writing? Where does it
diverge from how you actually write?"

**RO**: "Cum ai VREA să pari când scrii? Unde se rupe asta de felul în
care scrii de fapt?"

**Probes**: The gap between aspirational and actual voice. This is
critical metadata for the downstream LLM — it tells the imitator which
voice to favor when the two conflict.

**Why kept**: Cannot be inferred from logs (logs show only actual). The
gap is itself the signal.

### Q9 — Core motivation / fear (Enneagram-style)

**EN**: "Finish this honestly: *I most want to be seen as ____, and I
most fear being seen as ____.*"

**RO**: "Completează sincer: *Cel mai mult vreau să fiu văzut ca ____, și
cel mai mult mă tem să fiu văzut ca ____.*"

**Probes**: Enneagram core motivation / core fear (used as a prompt only,
not scored). Narrative-rich self-knowledge that no trait model captures.

**Why kept**: Two blanks, two sentences of writing, an enormous amount of
voice color. The Enneagram's pseudoscientific status doesn't matter here
because we're not assigning a type — we're just borrowing the question
shape.

### Q10 — Aspirational register sample

**EN**: "Write 3–4 sentences in a style you admire — anyone, real or
fictional. Then briefly: why that style?"

**RO**: "Scrie 3–4 propoziții într-un stil pe care îl admiri — al
oricui, real sau ficțional. Apoi pe scurt: de ce acel stil?"

**Probes**: Aspirational register (what the user *aims* for); their taste
in writing; the "why" surfaces the dimensions they value (precision,
warmth, economy, etc.).

**Why kept**: A free-text answer about taste in writing is unusually
information-dense for an LLM that needs to imitate writing.

### Q11 (optional) — Existing self-knowledge

**EN**: "If you've ever taken MBTI / 16personalities / Enneagram and a
result felt accurate, what was it and what felt right? (Skip if none.)"

**RO**: "Dacă ai făcut vreodată MBTI / 16personalities / Enneagram și un
rezultat ți s-a părut că te descrie corect, care a fost și ce anume a
sunat adevărat?"

**Probes**: Pre-existing self-knowledge in the user's preferred typology
vocabulary. Cheap to ask, useful if they have it, harmless if they skip.

**Why kept (as optional)**: Zero-cost if skipped, valuable if answered.
The "what felt right" half is the more important part — it filters out
the user's noise about which test they took and surfaces the parts they
endorse.

## REPL UX spec

Implementation target: Node `readline`, no extra dependencies beyond
what's already in [package.json](../../../package.json) (chalk for color is
already there).

### Launch

```
npm run start -- --interview
```

Prints a short orientation: "10 questions, ~20 minutes, all free-text,
answers saved as you go to inputs/questionnaire/answers.md. Press
Ctrl+C any time, your progress is saved."

### Per-question layout

```
[3/10] Q3 — Belief asymmetry
       Care e o convingere pe care o ai, dar pe care majoritatea celor
       din jur nu o împărtășesc? Nu trebuie să o aperi.

       (Hint in dim color: write as much or as little as you want;
        press Enter twice on an empty line to submit; type :skip, :back,
        :quit at any time.)

> _
```

The English wording can be toggled with a flag (`--interview --en`) or
shown beneath the Romanian in dim color by default. Decision deferred to
implementation time.

### Multi-line input

End on an empty line (two consecutive Enters), or on the literal token
`:done` on its own line.

### Navigation commands

- `:skip` — record `[skipped]` and move on.
- `:back` — discard the current answer, re-ask the previous question.
- `:quit` — save progress so far and exit cleanly.
- `:help` — list these commands.

### Crash safety

Append to `inputs/questionnaire/answers.md` immediately after each answer.
If the REPL crashes or the user Ctrl+Cs, their progress is on disk. On
relaunch, detect existing partial file and prompt: "Resume from Q4 or
start over?"

### No LLM during the REPL

The interview is intentionally dumb. No adaptive branching, no probe
generation. This:

- Keeps the REPL instant (no network calls).
- Avoids requiring Claude Code or Ollama to be running.
- Keeps the design simple — all the meaning-making happens at extract
  time.

If the future shows that some answers come out too sparse to be useful,
*hardcoded* probes per question (e.g., "Can you give a specific example?"
appears if answer is < 30 words) can be added without architectural
change.

## File format: `inputs/questionnaire/answers.md`

```markdown
# Soul Questionnaire — 2026-05-20T18:22:14Z

## Q1 — Recurring frustration

[user's free-text answer, possibly multi-paragraph]

## Q2 — Hidden passion

[user's free-text answer]

## Q3 — Belief asymmetry

[skipped]

## Q4 — Narrative identity

[user's free-text answer]

...
```

Notes:

- Plain markdown, easy to hand-edit later (the user might want to refine
  an answer before extraction).
- `[skipped]` is the literal marker the extract step looks for to ignore
  that section.
- Timestamp at top is for the user's reference (if they redo it months
  later); the extract step does not use it.
- The file is gitignored — same as the rest of `inputs/`.

## Question source-of-truth

The questions live in code, not in a markdown file the user can edit:

```ts
// src/questions.ts
export type Question = {
  id: string;          // "Q1"
  slug: string;        // "recurring-frustration"
  promptRo: string;
  promptEn: string;
  hintRo?: string;
  hintEn?: string;
  optional?: boolean;
};

export const QUESTIONS: ReadonlyArray<Question> = [
  /* Q1..Q10 + Q11 */
];
```

Reasoning:

- The questions are an opinionated design artifact. The user editing them
  freely defeats the calibration.
- Adding / changing questions should be a version-controlled change with
  a commit message, not a silent edit to a user-mutable file.
- The user can still *override* in their answers (skip, write
  off-topic, etc.) — they just can't accidentally break the question set.

## Reasonable defaults the design assumes

These are choices that the implementation can revisit if the user
disagrees, but are baked into the design as written:

- **Romanian primary.** Question stems shown in Romanian; English in dim
  color underneath. The user can flip with `--en` if needed.
- **No live interpretation.** REPL is offline, no LLM calls during the
  interview.
- **Single answers.md per session.** No history of multiple interviews —
  a re-run overwrites (after a confirm prompt and a backup to
  `answers.prev.md`).
- **Crash-safe writes.** Each answer is flushed to disk before showing
  the next question.
- **Skip is first-class.** Skipping a question is normal, not an error,
  and the extract step handles it gracefully.
