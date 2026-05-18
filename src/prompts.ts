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

export const REDUCE_PROMPT_HEADER = `You are synthesizing a personality / voice profile from many batches of observations.
Each batch below was extracted from a different slice of the same person's private chats.

Your task: produce a single coherent markdown document titled "# My Soul" that captures this person's voice in a way another LLM could USE to imitate their writing style.

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

## Stylistic Habits
- sentence length tendencies
- punctuation tendencies
- formatting habits
- emoji habits

## How To Imitate
A short paragraph giving an LLM concrete instructions to write as this person.

Rules:
- Reconcile contradictions across batches by noting context (e.g. "more formal with strangers, blunt with close friends") rather than picking one.
- Do NOT quote verbatim phrases from the source.
- Output ONLY the markdown document. No preamble.

Observation batches:
`;
