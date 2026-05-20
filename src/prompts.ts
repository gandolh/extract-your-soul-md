export const MAP_PROMPT_HEADER = `You are analyzing a batch of messages written by ONE person (the user) in private chats.
Your task: extract concise observations about this person's VOICE and PERSONALITY.

Output 5-15 bullet points covering, when evident:
- Tone & register (formal / casual / sarcastic / warm / blunt)
- Recurring vocabulary, slang, filler words, signature phrases
- Languages used and code-switching habits
- Humor style (dry, self-deprecating, absurd, none)
- Recurring topics, hobbies, professional context
- Values, opinions, recurring complaints or enthusiasms
- How they handle disagreement, apology, affection
- Sentence-length and punctuation habits

Rules:
- ONLY use what is supported by the messages below. Do NOT speculate.
- Do NOT quote verbatim — paraphrase to avoid leaking private content.
- Output ONLY the bullet list, no preamble, no closing remarks.

Messages:
`;

export const MAP_PROMPT_HEADER_QA = `You are analyzing answers to an open-ended personality / voice questionnaire.
The person being profiled wrote these answers themselves. Each \`## Qn — Title\`
block is one question and the user's free-text response. Skipped questions
are absent.

Each answer is BOTH:
- propositional content (beliefs, values, motivations, narrative arcs), AND
- a voice sample (how they explain themselves in their natural register).

Output 8-20 bullet points covering, when evident:
- Core values, recurring beliefs, "north star" themes
- Core motivation (what they want to be seen as) and core fear (what they fear being seen as)
- Narrative-identity tendencies (redemption vs. contamination framing of life events)
- Recurring frustrations and how they describe them
- Hidden passions / topics they care about but rarely message about
- Self-perception gap: how they'd LIKE to come across vs. how they actually write
- Code-switching range: how their register shifts across contexts (friend, work, stranger)
- Whether they tend to write to CONNECT or to INFORM
- Humor style with named flavors (dry, absurd, observational, self-deprecating, etc.)
- Aspirational register: who they admire in writing and why
- Stylistic habits visible in the explanatory prose of the answers themselves

Rules:
- ONLY use what is supported by the answers below. Do NOT speculate.
- Do NOT quote verbatim — paraphrase to avoid leaking private content.
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
- sentence length tendencies
- punctuation tendencies
- formatting habits
- emoji habits

## How To Imitate
A short paragraph giving an LLM concrete instructions to write as this person.

Rules:
- Reconcile contradictions across batches by noting context (e.g. "more formal with strangers, blunt with close friends") rather than picking one.
- When a questionnaire batch and a chat-log batch conflict, the chat-log batch wins for observable style (vocabulary, punctuation, sentence rhythm); the questionnaire batch wins for values, beliefs, motivations, and aspirational register.
- Do NOT quote verbatim phrases from the source.
- Output ONLY the markdown document. No preamble.

Observation batches:
`;
