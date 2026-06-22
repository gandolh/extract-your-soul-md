export const MAP_PROMPT_HEADER = `You are analyzing a batch of messages written by ONE person (the user) in private chats.
This is the richest source of their SPEECH PATTERNS — how they actually write in the wild. Your task: extract concise observations that another LLM could USE to MECHANICALLY IMITATE this person's writing — a style card, not a personality report. Favor concrete, reproducible patterns of speech over abstract traits.

Emit only well-supported observations — fewer is better. If the chunk is thin, return few bullets; do NOT pad to a count. Lead with SPEECH PATTERNS, covering when evident:
- Tone & register (formal / casual / sarcastic / warm / blunt) and how it shifts by addressee
- Function-word habits: pronoun and article density, lowercase "i", contractions vs. full forms
- Typical message length in words (short fragments vs. long paragraphs); whether they burst many short messages or send one long one
- Sentence structure: run-ons vs. clipped fragments, how they chain or break clauses, question vs. statement rate
- Capitalization quirks (all-lowercase, sentence case, ALL CAPS for emphasis)
- Emoji rate per message and WHICH emoji recur; same for punctuation marks (ellipses, multiple "!!!", trailing nothing)
- Signature openers, closers, interjections, and catchphrases (quote these short tokens exactly — see rules)
- Recurring vocabulary, slang, filler words, verbal tics
- Languages used and code-switching habits (what triggers a switch, mid-sentence vs. mid-conversation)
- Hedging / softening habits and how they handle disagreement, apology, affection
- Humor style (dry, self-deprecating, absurd, none)
- Recurring topics, hobbies, professional context
- Opinions/enthusiasms only as directly stated
- Whether they tend to write to CONNECT or to INFORM, message to message
- Note the em-dash "—" if present: record it as a fact, but it is a common AI tell — do NOT recommend leaning into it

Rules:
- ONLY use what is supported by the messages below. Do NOT speculate.
- Privacy vs. voice: do NOT reproduce whole private sentences or named facts/entities (people, places, employers, specifics) — paraphrase those. But DO preserve short, high-frequency, non-private stylistic tokens verbatim (greetings, sign-offs, fillers, interjections, catchphrases) — these ARE the voice and "uses casual greetings" destroys imitability.
- Output ONLY the bullet list, no preamble, no closing remarks.

Messages:
`;

// Generates the deck of "does this sound like you?" cards. Fed the user's own
// study answers (+ scored trait profile + any prior soul.md), it proposes
// short, first-person, falsifiable statements the user then swipes yes/no. The
// confirmed ones are folded back into soul.md, so this is an active-learning
// refinement loop, not a fresh personality test.
export const SWIPE_CARD_PROMPT_HEADER = `You are helping build a personal "voice profile" for ONE person.
Below is material they produced about themselves: free-text answers to a
personality / voice questionnaire, a scored trait profile, and possibly an
earlier draft of their profile.

Your task: write a list of SHORT, FIRST-PERSON statements that this person will
swipe through, marking each "sounds like me" or "not like me" (Tinder-style).
The point is to CONFIRM and SHARPEN the profile, so the statements must be
falsifiable — a real person should be able to disagree with some of them.

Cover a mix across these kinds:
- Writing voice & style ("I write in short, clipped sentences", "I overuse parentheses")
- Tone & humor ("My humor is dry and self-deprecating", "I rarely joke in writing")
- Beliefs & values ("I think most rules are worth questioning")
- Motivations & fears ("I most want to be seen as competent, not likeable")
- Self-perception ("I come across as more confident than I feel")
- Habits & temperament ("I overthink small decisions", "I'd rather text than call")

Rules:
- Ground EVERY statement in the material below — infer from what they actually
  wrote and how they wrote it. Do NOT invent traits with no support.
- Keep each statement under ~15 words, concrete, and in plain first person ("I …").
- Make them DISTINCT — no two near-duplicates. Vary the kinds above.
- Include several you are LESS sure about (plausible but unconfirmed) so the
  yes/no answer is informative — but never absurd or insulting.
- Output ONLY the statements, one per line. No numbering, no bullets, no quotes,
  no preamble, no blank lines, no headers.

Material:
`;

export const MAP_PROMPT_HEADER_QA = `You are analyzing answers to an open-ended personality / voice questionnaire.
The person being profiled wrote these answers themselves. Each \`## Qn — Title\`
block is one question and the user's free-text response. Skipped questions
are absent.

Each answer is BOTH:
- a voice sample (how they explain themselves in their natural register), AND
- propositional content (beliefs, values, motivations, narrative arcs).

The voice sample is the PRIMARY signal — the explanatory prose shows how this
person actually writes. Extract that first and most. The propositional content
is secondary context.

Tag every bullet with its provenance, because the two kinds carry very different
evidential weight:
- Prefix \`in-prose:\` for features OBSERVED in how they actually wrote the answers
  (their real word choice, rhythm, punctuation, register) — strong, hard evidence.
- Prefix \`self-described:\` for what they CLAIM about themselves (stated values,
  how they think they come across, who they admire) — weaker self-report.

Emit only well-supported observations — fewer is better. If the answers are thin, return few bullets; do NOT pad to a count. Lead with VOICE FEATURES drawn from the prose itself, when evident (these are \`in-prose:\`):
- in-prose: Function-word habits, typical sentence/answer length, capitalization quirks
- in-prose: Emoji and punctuation habits (note the em-dash "—" as a fact, but it is a common AI tell — do NOT recommend leaning into it)
- in-prose: Signature openers, closers, interjections, catchphrases (quote these short tokens exactly — see rules)
- in-prose: Recurring vocabulary, slang, fillers
- in-prose: Code-switching range: how their register shifts across contexts (friend, work, stranger), and what triggers a switch
- in-prose: Humor style with named flavors (dry, absurd, observational, self-deprecating, etc.)
- in-prose: Whether they tend to write to CONNECT or to INFORM

Then, as a SECONDARY set (fewer bullets), the propositional content, when evident (these are \`self-described:\` unless the answer's own prose demonstrates it):
- self-described: Core values, recurring beliefs, "north star" themes
- self-described: Core motivation (what they want to be seen as) and core fear (what they fear being seen as)
- self-described: Narrative-identity tendencies (redemption vs. contamination framing of life events)
- self-described: Recurring frustrations; hidden passions they rarely message about
- self-described: Self-perception gap: how they'd LIKE to come across vs. how they actually write
- self-described: Aspirational register: who they admire in writing and why

Rules:
- ONLY use what is supported by the answers below. Do NOT speculate.
- Privacy vs. voice: do NOT reproduce whole private sentences or named facts/entities — paraphrase those. But DO preserve short, high-frequency, non-private stylistic tokens verbatim (greetings, sign-offs, fillers, interjections, catchphrases) — these ARE the voice.
- Output ONLY the bullet list, no preamble, no closing remarks.

Questionnaire answers:
`;

// The three questionnaire-only sections are gated by the ORCHESTRATOR, not the
// model: when no chunk has kind === 'questionnaire' the blocks are omitted from
// the prompt entirely, so a small model (e.g. llama3.1:8b) can't hallucinate a
// core motivation/fear from a chat-only corpus. See buildReducePrompt below.
const REDUCE_QA_SECTIONS = `
## Core Motivation & Fears
(2-4 sentences — describe what they most want to be seen as and what they most
fear being seen as, and how that shapes their voice. Omit if not evident.)

## Communication Style
- whether they write more to connect or to inform, with any context-dependent flips
- how their register shifts across audiences (friend / colleague / stranger)
- dominant layer they lead with (facts / self-revelation / relationship / appeal)
- omit any sub-bullet not evident in the batches

## Self-Perception vs. Observed Voice
(List 1-3 SPECIFIC places where the questionnaire self-description diverges from
observed habits — e.g. "says they write concisely, but answers run to long
multi-clause sentences" — then state which register a downstream LLM should
imitate by default: the OBSERVED one. Omit if no concrete divergence is evident.)
`;

// The conflict-reconciliation rule only matters when both source kinds are
// present, so it is gated alongside the QA sections.
const REDUCE_QA_CONFLICT_RULE = `
- When a questionnaire batch and a chat-log batch conflict, the chat-log batch wins for observable style (vocabulary, punctuation, sentence rhythm); the questionnaire batch wins for values, beliefs, motivations, and aspirational register.`;

// Questionnaire map bullets are tagged \`in-prose:\` (observed in how they wrote)
// or \`self-described:\` (what they claim about themselves). This rule teaches the
// reduce step to weight the typed inputs — useful even in a questionnaire-ONLY
// corpus, so it is gated on hasQuestionnaire but independent of the chat-vs-QA
// batch rule above. Strip the prefixes from the final document.
const REDUCE_PROVENANCE_RULE = `
- Some questionnaire bullets are prefixed \`in-prose:\` (a feature OBSERVED in how they actually wrote) or \`self-described:\` (something they CLAIM about themselves). Trust \`in-prose:\` over \`self-described:\` for any observable style judgment; treat \`self-described:\` as weaker self-report — fold it into values/aspiration, not into how-they-write, unless an \`in-prose:\` bullet corroborates it. Do NOT carry the \`in-prose:\` / \`self-described:\` prefixes into the final document.`;

// A self-reported trait profile (Big Five / tone / values / regulatory focus /
// locus of control / PCM / MBTI) the user opted into. The two sources COLLABORATE:
// the trait profile says WHO the person is and WHAT they value; the observed
// voice (chat logs + the prose of their answers) shows HOW they sound. Neither
// is "the weak one" — they corroborate, and only genuine contradictions are
// flagged rather than auto-resolved in voice's favor. Gated on hasProfile.
const REDUCE_PROFILE_RULE = `
- A "Self-Reported Personality Profile" block may appear among the batches: the user's own answers to short, validated trait questionnaires (Big Five, tone/stance, core values, regulatory focus, locus of control, reaction frame, type indicator). Treat it as a FULL collaborator with the observed voice, not a weak afterthought — the profile tells you who this person is and what they care about; the observed voice tells you how they sound. Let the profile drive Values & Worldview and the "Personality Notes" section directly, and let it inform Tone. For concrete surface mechanics (vocabulary, punctuation, sentence rhythm), the observed voice is the primary source — but use the profile to EXPLAIN and corroborate those mechanics, not to override them. When the profile and the observed voice genuinely conflict (e.g. self-reports as reserved but writes with exclamation-heavy warmth), NOTE the tension in one clause and describe both rather than silently dropping the self-report. Translate trait readings into plain how-they-come-across language; do not print raw percentages or a 4-letter type code as fact in the document.`;

// When a profile is present, soul.md gets a "Personality Notes" section that
// turns the trait readout into DIRECTIONAL guidance for the imitator — what each
// strong reading means for stance, word choice, framing, and pacing. Under the
// co-equal premise these are real directions, corroborated by (not subordinate
// to) the observed voice. Gated on hasProfile.
const REDUCE_PROFILE_SECTION = `
## Personality Notes
(3-6 sentences, ONLY if a "Self-Reported Personality Profile" block is present.
Turn the clearest trait readings into concrete directions a writer could follow,
drawing on every instrument that has data — for example:
- Big Five / Need for Cognition: "high openness and need-for-cognition — at home
  with tangents, abstraction, and qualified, elaborated sentences" or, if low,
  "keeps it concrete and concise; few hedges."
- Core Values: name the 2-3 top values and what they make the person write ABOUT
  and argue for (e.g. "values self-direction and universalism — frames things
  around autonomy and fairness").
- Regulatory Focus: "promotion-leaning — frames around gains, growth, and
  opportunity" vs "prevention-leaning — frames around risks, duties, and what to
  avoid."
- Locus of Control: "internally driven — narrates as the author of events, active
  voice" vs "external — narrates circumstances, more passive/conditional."
- Tone/stance and type indicator: fold in only where they're decisive.
Cover only readings that are clearly high or low or a clear top value; skip
anything near the midpoint. Frame as how-they-come-across guidance, never a
clinical readout, and NEVER cite percentages or a type code. Where the observed
voice corroborates a trait, you may say so; where it genuinely contradicts one,
note the tension in a clause. Omit the section only if no reading is decisive.)`;

/**
 * Build the reduce prompt. The three questionnaire-derived sections (and the
 * questionnaire-vs-chat conflict rule) are included ONLY when the corpus
 * actually contains questionnaire chunks — a machine decision from the
 * manifest's `kind` field, not a prose label the model is asked to honor.
 * `hasProfile` separately gates the self-report-profile weighting rule.
 */
export function buildReducePrompt(hasQuestionnaire: boolean, hasProfile = false): string {
  return `You are synthesizing a personality / voice profile from many batches of observations.
Each batch below was extracted from a different slice of the same person — either
chat logs (chat-fragment style) or a personality questionnaire (Q&A style).

Your task: produce a single coherent markdown document titled "# My Soul" that captures
this person's voice in a way another LLM could USE to imitate their writing style.

Required structure:
# My Soul

## Tone & Register
(2-4 sentences)

## Vocabulary & Signature Phrases
- bullet list of recurring words, slang, fillers, code-switches
- preserve the person's actual short signature tokens (greetings, sign-offs, interjections, catchphrases) verbatim — these are the voice; do NOT generalize them into descriptions like "uses casual greetings"

## Humor
(2-3 sentences, or "none observed")

## Recurring Topics & Interests
- bullet list

## Values & Worldview
- bullet list
${hasQuestionnaire ? REDUCE_QA_SECTIONS : ''}${hasProfile ? REDUCE_PROFILE_SECTION : ''}
## Stylistic Habits
- function-word habits, typical message length in words, capitalization quirks
- sentence length tendencies
- punctuation tendencies (if the em-dash "—" appears, record it — but flag it as a common AI tell and do NOT tell the imitator to use it)
- formatting habits
- emoji habits (rate per message + which emoji recur)

## How To Imitate
A short paragraph giving an LLM concrete instructions to write as this person.
Include their natural sentence-length and rhythm variation (avoid uniform, evenly-paced cadence — that reads as generic AI prose).

## Representative Samples
A short bullet list (3-6) of the person's OWN short signature tokens — greetings,
sign-offs, interjections, fillers, catchphrases — quoted verbatim, to anchor the
How-To-Imitate spec with concrete examples. STRICT rules for this section:
- ONLY reuse the short verbatim tokens already surfaced in the batches above. Do
  NOT compose new sentences, paraphrase into examples, or invent excerpts — a
  fabricated "sample" is worse than none (it teaches a generic AI cadence as if
  it were this person's).
- Each entry is a SHORT token or fragment (a few words), never a whole sentence,
  and must contain NO names, places, employers, or other identifying specifics.
- If the batches did not preserve enough non-private verbatim tokens to fill it
  honestly, emit FEWER entries or OMIT the section entirely. Never pad it.

## Drift Anchor
A compressed restatement of How To Imitate (5-8 lines, NOT a near-duplicate) that a
consumer can re-paste mid-conversation to counteract voice drift. Distill ONLY the
highest-signal, most distinctive signature vocabulary/punctuation/cadence already
named above, plus the one-line imitation directive. Self-contained and terse.

Rules:
- Reconcile contradictions across batches by noting context (e.g. "more formal with strangers, blunt with close friends") rather than picking one.${hasQuestionnaire ? REDUCE_QA_CONFLICT_RULE : ''}${hasQuestionnaire ? REDUCE_PROVENANCE_RULE : ''}${hasProfile ? REDUCE_PROFILE_RULE : ''}
- Privacy vs. voice: do NOT reproduce whole private sentences or named facts/entities from the source — but DO keep the short, high-frequency, non-private stylistic tokens (greetings, sign-offs, fillers, catchphrases) verbatim, since they are the imitable core of the voice.
- Prefer specific over vague. Drop any descriptor that would apply to most people. Keep distinctive/rare/surprising features over common ones. Never pad a section to fit the template — omit it.
- Output ONLY the markdown document. No preamble.

Observation batches:
`;
}
