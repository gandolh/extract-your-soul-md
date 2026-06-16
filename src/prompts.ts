export const MAP_PROMPT_HEADER = `You are analyzing a batch of messages written by ONE person (the user) in private chats.
Your task: extract concise observations that another LLM could USE to MECHANICALLY IMITATE this person's writing — a style card, not a personality report. Favor concrete, reproducible features over abstract traits.

Output 5-15 bullet points covering, when evident:
- Tone & register (formal / casual / sarcastic / warm / blunt)
- Function-word habits: pronoun and article density, lowercase "i", contractions vs. full forms
- Typical message length in words (short fragments vs. long paragraphs)
- Capitalization quirks (all-lowercase, sentence case, ALL CAPS for emphasis)
- Emoji rate per message and WHICH emoji recur; same for punctuation marks
- Signature openers, closers, interjections, and catchphrases (quote these short tokens exactly — see rules)
- Recurring vocabulary, slang, filler words
- Languages used and code-switching habits (what triggers a switch)
- Humor style (dry, self-deprecating, absurd, none)
- Recurring topics, hobbies, professional context
- Opinions/enthusiasms only as directly stated
- How they handle disagreement, apology, affection
- Sentence-length and punctuation habits (note if they use the em-dash "—": record it as a fact, but it is a common AI tell — do NOT recommend leaning into it)

Rules:
- ONLY use what is supported by the messages below. Do NOT speculate.
- Privacy vs. voice: do NOT reproduce whole private sentences or named facts/entities (people, places, employers, specifics) — paraphrase those. But DO preserve short, high-frequency, non-private stylistic tokens verbatim (greetings, sign-offs, fillers, interjections, catchphrases) — these ARE the voice and "uses casual greetings" destroys imitability.
- Output ONLY the bullet list, no preamble, no closing remarks.

Messages:
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

Output 8-20 bullet points. Lead with VOICE FEATURES drawn from the prose itself,
when evident:
- Function-word habits, typical sentence/answer length, capitalization quirks
- Emoji and punctuation habits (note the em-dash "—" as a fact, but it is a common AI tell — do NOT recommend leaning into it)
- Signature openers, closers, interjections, catchphrases (quote these short tokens exactly — see rules)
- Recurring vocabulary, slang, fillers
- Code-switching range: how their register shifts across contexts (friend, work, stranger), and what triggers a switch
- Humor style with named flavors (dry, absurd, observational, self-deprecating, etc.)
- Whether they tend to write to CONNECT or to INFORM

Then, as a SECONDARY set (fewer bullets), the propositional content, when evident:
- Core values, recurring beliefs, "north star" themes
- Core motivation (what they want to be seen as) and core fear (what they fear being seen as)
- Narrative-identity tendencies (redemption vs. contamination framing of life events)
- Recurring frustrations; hidden passions they rarely message about
- Self-perception gap: how they'd LIKE to come across vs. how they actually write
- Aspirational register: who they admire in writing and why

Rules:
- ONLY use what is supported by the answers below. Do NOT speculate.
- Privacy vs. voice: do NOT reproduce whole private sentences or named facts/entities — paraphrase those. But DO preserve short, high-frequency, non-private stylistic tokens verbatim (greetings, sign-offs, fillers, interjections, catchphrases) — these ARE the voice.
- Output ONLY the bullet list, no preamble, no closing remarks.

Questionnaire answers:
`;

export const REDUCE_PROMPT_HEADER = `You are synthesizing a personality / voice profile from many batches of observations.
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

## Core Motivation & Fears
(2-4 sentences — only include if the questionnaire batches supplied this.
Describe what they most want to be seen as and what they most fear being seen as,
and how that shapes their voice. Omit the section entirely if not evident.)

## Communication Style
- whether they write more to connect or to inform, with any context-dependent flips
- how their register shifts across audiences (friend / colleague / stranger)
- dominant layer they lead with (facts / self-revelation / relationship / appeal)
- omit any sub-bullet not evident in the batches

## Self-Perception vs. Observed Voice
(2-4 sentences — only include if the questionnaire batches supplied this.
Describe how they'd LIKE to come across vs. how they actually write, and which
register a downstream LLM should imitate by default. Omit the section entirely
if not evident.)

## Stylistic Habits
- function-word habits, typical message length in words, capitalization quirks
- sentence length tendencies
- punctuation tendencies (if the em-dash "—" appears, record it — but flag it as a common AI tell and do NOT tell the imitator to use it)
- formatting habits
- emoji habits (rate per message + which emoji recur)

## How To Imitate
A short paragraph giving an LLM concrete instructions to write as this person.

Rules:
- Reconcile contradictions across batches by noting context (e.g. "more formal with strangers, blunt with close friends") rather than picking one.
- When a questionnaire batch and a chat-log batch conflict, the chat-log batch wins for observable style (vocabulary, punctuation, sentence rhythm); the questionnaire batch wins for values, beliefs, motivations, and aspirational register.
- Privacy vs. voice: do NOT reproduce whole private sentences or named facts/entities from the source — but DO keep the short, high-frequency, non-private stylistic tokens (greetings, sign-offs, fillers, catchphrases) verbatim, since they are the imitable core of the voice.
- Output ONLY the markdown document. No preamble.

Observation batches:
`;
