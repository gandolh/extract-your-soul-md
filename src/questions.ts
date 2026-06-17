// The questionnaire — see corpus/wiki/sources-raw/02-questionnaire-design.md for
// the rationale behind each question, and
// corpus/wiki/sources-raw/01-research-synthesis.md for the research that led to
// the minimum-set shape.

// A single selectable option for a choice question. `value` is the stable,
// language-neutral token persisted in the answer body and consumed by the
// scorer; the user only ever sees the label. For Likert-style scale questions
// the values are numeric strings "1".."5" (1 = left pole).
export interface Choice {
  value: string;
  label: string;
}

// Which family of report a choice question feeds, so the scorer can group the
// answers it needs without re-deriving the mapping from question ids.
export type ReportKey =
  | 'big-five'
  | 'honesty-tone'
  | 'pcm'
  | 'mbti'
  | 'need-for-cognition'
  | 'values'
  | 'regulatory-focus'
  | 'locus-of-control';

export interface Question {
  id: string;
  slug: string;
  title: string;
  prompt: string;
  hint?: string;
  optional?: boolean;

  // --- Choice questions (trait profiling) ---------------------------------
  // A question is free-text unless `kind: 'choice'`. Free-text questions keep
  // exactly the shape they had before this field existed, so Q1..Q12 are
  // unchanged and the answers.md contract is untouched.
  kind?: 'text' | 'choice';
  // 'scale'  → 5-point bipolar Likert, rendered as a single labeled track
  //            (left..right); value is "1".."5".
  // 'single' → pick exactly one of `choices`.
  choiceMode?: 'scale' | 'single';
  choices?: ReadonlyArray<Choice>;
  // Pole labels for a 'scale' question (value 1 = left, value 5 = right).
  left?: string;
  right?: string;

  // --- Scoring metadata (choice questions only) ---------------------------
  reportKey?: ReportKey;
  // For big-five: the trait this item loads on. For mbti: the axis.
  traitKey?: 'O' | 'C' | 'E' | 'A' | 'N' | 'EI' | 'SN' | 'TF' | 'JP';
  // For honesty-tone: which bipolar tone axis this item loads on. The scorer
  // averages every item sharing a `toneAxis` (value "1"=left pole .. "5"=right).
  toneAxis?: 'modesty' | 'rapport' | 'formality' | 'seriousness' | 'irreverence' | 'enthusiasm';
  // For values (Schwartz TIVI): which of the 10 basic values this portrait loads
  // on. Scored as a higher-is-more-like-me agreement item (no reverse).
  valueKey?:
    | 'conformity' | 'tradition' | 'benevolence' | 'universalism' | 'self-direction'
    | 'stimulation' | 'hedonism' | 'achievement' | 'power' | 'security';
  // For regulatory-focus (RFQ): promotion (approach/gains) vs prevention
  // (avoid/loss). Averaged per focus; `reverse` flips an item first.
  focusKey?: 'promotion' | 'prevention';
  // For locus-of-control (IE-4): internal (own effort) vs external (others/fate).
  locusKey?: 'internal' | 'external';
  // Reverse-key a scale item before averaging (TIPI items 2,4,6,8,10; some
  // OEJTS pairs whose poles are flipped relative to the axis direction).
  reverse?: boolean;
}

export const QUESTIONS: ReadonlyArray<Question> = [
  {
    id: 'Q1',
    slug: 'recurring-frustration',
    title: 'Recurring frustration',
    prompt:
      'Describe a recurring frustration in your life — vent it like you would to a close friend.',
    hint: 'Write as much as you want. Informal tone is welcome.',
  },
  {
    id: 'Q2',
    slug: 'hidden-passion',
    title: 'Hidden passion',
    prompt:
      "Tell me about something you're passionate about that few people around you share. Why does it matter?",
    hint: 'Say what first drew you in and why it has stuck.',
  },
  {
    id: 'Q3',
    slug: 'belief-asymmetry',
    title: 'Belief asymmetry',
    prompt:
      "What's a belief you hold that most people around you don't? You don't have to defend it.",
    hint: "No need to convince anyone — just say how it sounds in your head.",
  },
  {
    id: 'Q4',
    slug: 'narrative-identity',
    title: 'Narrative identity',
    prompt:
      "Tell me about a time something went wrong and what came of it. Write it the way you'd tell a close friend.",
    hint: 'Let the story run — the setup, what happened, how it ended up.',
  },
  {
    id: 'Q5',
    slug: 'code-switching',
    title: 'Code-switching range',
    prompt:
      'How would you describe how you write differently to: (a) a close friend, (b) a colleague at work, (c) a stranger you\'re being polite to?',
    hint: 'Concrete examples help — a typical message for each.',
  },
  {
    id: 'Q6',
    slug: 'rapport-vs-report',
    title: 'Connect or inform',
    prompt:
      'When you write, are you more often trying to connect with someone or to inform them? Are there contexts where this flips?',
    hint: 'If it shifts by situation, say when and why.',
  },
  {
    id: 'Q7',
    slug: 'humor-style',
    title: 'Humor style',
    prompt:
      'Your humor — when it shows up, what flavor is it? Examples welcome.',
    hint: 'An example joke or a moment you found funny.',
  },
  {
    id: 'Q8',
    slug: 'self-perception-gap',
    title: 'Self-perception vs. actual',
    prompt:
      'How would you LIKE to come across in writing? Where does it diverge from how you actually write?',
    hint: 'Be honest about the gap between intention and result.',
  },
  {
    id: 'Q9',
    slug: 'core-want-fear',
    title: 'Core want / core fear',
    prompt:
      'Finish this honestly: I most want to be seen as ____, and I most fear being seen as ____.',
    hint: 'Feel free to expand after filling the blanks — why these.',
  },
  {
    id: 'Q10',
    slug: 'aspirational-style-sample',
    title: 'Aspirational style sample',
    prompt:
      'Write 3–4 sentences in a style you admire — anyone, real or fictional. Then briefly: why that style?',
    hint: 'Actually write in that style, not just about it.',
  },
  {
    id: 'Q11',
    slug: 'existing-self-knowledge',
    title: 'Existing self-knowledge (optional)',
    prompt:
      "If you've ever taken MBTI / 16personalities / Enneagram and a result felt accurate, what was it and what felt right?",
    hint: "Skip if none feel like a fit.",
    optional: true,
  },
  {
    id: 'Q12',
    slug: 'narrative-high-point',
    title: 'Narrative high point',
    prompt:
      "Tell me about a time something went really right — something you're proud of. Write it the way you'd tell a close friend.",
    hint: "Let the story run — what you did, how it felt.",
  },

  // ==========================================================================
  // CHOICE QUESTIONS — trait profiling (Q13+).
  //
  // These feed the per-test report sections. Each answer is a picked value
  // (+ optional free-text "note"), encoded into the same `## Qn — Title`
  // answers.md section as the free-text questions. The free-text note keeps
  // the dual-use voice-sample benefit; the picked value drives scoring.
  //
  // Scale convention: value "1" = LEFT pole, "5" = RIGHT pole. `reverse: true`
  // flips the item before the scorer averages it onto its trait.
  // ==========================================================================

  // --- Big Five (TIPI, Gosling/Rentfrow/Swann 2003; free, unrestricted) -----
  // 10 items, 2 per trait, 5-point adapted. The classic TIPI pairs the two
  // adjectives per item; we keep that. Reverse items per the published key.
  {
    id: 'Q13',
    slug: 'tipi-extraversion',
    title: 'Outgoing energy',
    prompt: 'I see myself as extraverted, enthusiastic.',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Not at all',
    right: 'Very much',
    reportKey: 'big-five', traitKey: 'E',
  },
  {
    id: 'Q14',
    slug: 'tipi-extraversion-r',
    title: 'Reserve',
    prompt: 'I see myself as reserved, quiet.',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Not at all',
    right: 'Very much',
    reportKey: 'big-five', traitKey: 'E', reverse: true,
  },
  {
    id: 'Q15',
    slug: 'tipi-agreeableness',
    title: 'Warmth',
    prompt: 'I see myself as sympathetic, warm.',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Not at all',
    right: 'Very much',
    reportKey: 'big-five', traitKey: 'A',
  },
  {
    id: 'Q16',
    slug: 'tipi-agreeableness-r',
    title: 'Bluntness',
    prompt: 'I see myself as critical, quarrelsome.',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Not at all',
    right: 'Very much',
    reportKey: 'big-five', traitKey: 'A', reverse: true,
  },
  {
    id: 'Q17',
    slug: 'tipi-conscientiousness',
    title: 'Dependability',
    prompt: 'I see myself as dependable, self-disciplined.',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Not at all',
    right: 'Very much',
    reportKey: 'big-five', traitKey: 'C',
  },
  {
    id: 'Q18',
    slug: 'tipi-conscientiousness-r',
    title: 'Looseness',
    prompt: 'I see myself as disorganized, careless.',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Not at all',
    right: 'Very much',
    reportKey: 'big-five', traitKey: 'C', reverse: true,
  },
  {
    id: 'Q19',
    slug: 'tipi-stability',
    title: 'Even keel',
    prompt: 'I see myself as calm, emotionally stable.',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Not at all',
    right: 'Very much',
    // TIPI scores "Emotional Stability"; we report Neuroticism, so the
    // stability item is the reverse-keyed one for N.
    reportKey: 'big-five', traitKey: 'N', reverse: true,
  },
  {
    id: 'Q20',
    slug: 'tipi-neuroticism',
    title: 'Easily rattled',
    prompt: 'I see myself as anxious, easily upset.',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Not at all',
    right: 'Very much',
    reportKey: 'big-five', traitKey: 'N',
  },
  {
    id: 'Q21',
    slug: 'tipi-openness',
    title: 'Open to the new',
    prompt: 'I see myself as open to new experiences, complex.',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Not at all',
    right: 'Very much',
    reportKey: 'big-five', traitKey: 'O',
  },
  {
    id: 'Q22',
    slug: 'tipi-openness-r',
    title: 'Conventional',
    prompt: 'I see myself as conventional, uncreative.',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Not at all',
    right: 'Very much',
    reportKey: 'big-five', traitKey: 'O', reverse: true,
  },

  // --- Honesty-Humility + tone (HEXACO-H modesty + NN/g tone + Tannen) ------
  // Grouped into one report because they all describe self-presentation /
  // register. Scored as independent axes (no averaging across them).
  {
    id: 'Q23',
    slug: 'hexaco-modesty',
    title: 'Modesty vs. self-promotion',
    prompt: 'When I write about myself and my achievements, I tend to…',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Understate / let the work speak',
    right: 'Put my merits forward',
    reportKey: 'honesty-tone', toneAxis: 'modesty',
    hint: 'No "right" answer — describe your actual lean.',
  },
  {
    id: 'Q24',
    slug: 'tannen-rapport-report',
    title: 'Connect vs. inform',
    prompt: 'When I write, I most often try to…',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Connect with the person',
    right: 'Inform them',
    reportKey: 'honesty-tone', toneAxis: 'rapport',
  },
  {
    id: 'Q25',
    slug: 'tone-formal-casual',
    title: 'Formal vs. casual',
    prompt: 'My default tone in writing is more…',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Casual',
    right: 'Formal',
    reportKey: 'honesty-tone', toneAxis: 'formality',
  },
  {
    id: 'Q26',
    slug: 'tone-serious-funny',
    title: 'Serious vs. playful',
    prompt: 'In writing I lean toward…',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Playful / funny',
    right: 'Serious',
    reportKey: 'honesty-tone', toneAxis: 'seriousness',
  },
  {
    id: 'Q27',
    slug: 'tone-respectful-irreverent',
    title: 'Respectful vs. irreverent',
    prompt: 'Toward the subject and the reader, I am more…',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Respectful',
    right: 'Irreverent',
    reportKey: 'honesty-tone', toneAxis: 'irreverence',
  },
  {
    id: 'Q28',
    slug: 'tone-matteroffact-enthusiastic',
    title: 'Matter-of-fact vs. enthusiastic',
    prompt: 'The energy of my writing is more…',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Matter-of-fact',
    right: 'Enthusiastic',
    reportKey: 'honesty-tone', toneAxis: 'enthusiasm',
  },

  // --- PCM perceptual frame (Kahler; framework-inspired, single-select) -----
  {
    id: 'Q29',
    slug: 'pcm-perceptual-frame',
    title: 'Your first filter',
    prompt: 'When something happens, your first filter is usually…',
    kind: 'choice',
    choiceMode: 'single',
    reportKey: 'pcm',
    choices: [
      { value: 'thoughts', label: 'A thought — I analyze the facts and logic' },
      { value: 'opinions', label: 'An opinion — I judge it against my values' },
      { value: 'emotions', label: 'An emotion — I feel what it means for people' },
      { value: 'reactions', label: 'A reaction — an immediate gut like/dislike' },
      { value: 'actions', label: 'An action — I see what to do and start' },
      { value: 'reflections', label: 'A reflection — I step back and observe first' },
    ],
  },

  // --- MBTI (OEJTS items, open source; NOT trademarked MBTI items) ----------
  // 16 items, 4 per axis. Scale value 1 = LEFT word, 5 = RIGHT word.
  // `reverse: true` where the OEJTS pair's left word is the SECOND axis pole,
  // so the scorer can treat 5 == second-letter consistently per axis.
  // Axis second-letter convention: EI→I, SN→N, TF→F, JP→P.
  {
    id: 'Q30', slug: 'mbti-ei-1', title: 'Time alone', kind: 'choice', choiceMode: 'scale',
    prompt: 'Which describes you better?',
    left: 'Bored by time alone',
    right: 'Need time alone',
    reportKey: 'mbti', traitKey: 'EI',
  },
  {
    id: 'Q31', slug: 'mbti-ei-2', title: 'Work setting', kind: 'choice', choiceMode: 'scale',
    prompt: 'Which describes you better?',
    left: 'Work best in groups',
    right: 'Work best alone',
    reportKey: 'mbti', traitKey: 'EI',
  },
  {
    id: 'Q32', slug: 'mbti-ei-3', title: 'Talk or listen', kind: 'choice', choiceMode: 'scale',
    prompt: 'Which describes you better?',
    left: 'Talk more',
    right: 'Listen more',
    reportKey: 'mbti', traitKey: 'EI',
  },
  {
    id: 'Q33', slug: 'mbti-ei-4', title: 'Parties', kind: 'choice', choiceMode: 'scale',
    prompt: 'Which describes you better?',
    left: 'Parties fire me up',
    right: 'Parties wear me out',
    // left here = E (fired up), so 5 (right) = I already → no reverse.
    reportKey: 'mbti', traitKey: 'EI',
  },
  {
    id: 'Q34', slug: 'mbti-sn-1', title: 'Past or future', kind: 'choice', choiceMode: 'scale',
    prompt: 'Which describes you better?',
    left: 'Focused on the past',
    right: 'Focused on the future',
    reportKey: 'mbti', traitKey: 'SN',
  },
  {
    id: 'Q35', slug: 'mbti-sn-2', title: 'Detail or big picture', kind: 'choice', choiceMode: 'scale',
    prompt: 'Which describes you better?',
    left: 'Want the details',
    right: 'Want the big picture',
    reportKey: 'mbti', traitKey: 'SN',
  },
  {
    id: 'Q36', slug: 'mbti-sn-3', title: 'What or why', kind: 'choice', choiceMode: 'scale',
    prompt: 'Which describes you better?',
    left: 'What happened',
    right: 'What it meant',
    reportKey: 'mbti', traitKey: 'SN',
  },
  {
    id: 'Q37', slug: 'mbti-sn-4', title: 'Empirical or theoretical', kind: 'choice', choiceMode: 'scale',
    prompt: 'Which describes you better?',
    left: 'Empirical',
    right: 'Theoretical',
    reportKey: 'mbti', traitKey: 'SN',
  },
  {
    id: 'Q38', slug: 'mbti-tf-1', title: 'Head or heart', kind: 'choice', choiceMode: 'scale',
    prompt: 'Which describes you better?',
    left: 'Follow the head',
    right: 'Follow the heart',
    reportKey: 'mbti', traitKey: 'TF',
  },
  {
    id: 'Q39', slug: 'mbti-tf-2', title: 'Justice or compassion', kind: 'choice', choiceMode: 'scale',
    prompt: 'Which describes you better?',
    left: 'Morality on justice',
    right: 'Morality on compassion',
    reportKey: 'mbti', traitKey: 'TF',
  },
  {
    id: 'Q40', slug: 'mbti-tf-3', title: 'Respect or love', kind: 'choice', choiceMode: 'scale',
    prompt: 'Which describes you better?',
    left: "Want people's respect",
    right: 'Want their love',
    reportKey: 'mbti', traitKey: 'TF',
  },
  {
    id: 'Q41', slug: 'mbti-tf-4', title: 'Emotions', kind: 'choice', choiceMode: 'scale',
    prompt: 'Which describes you better?',
    left: 'Uncomfortable with emotions',
    right: 'Value emotions',
    reportKey: 'mbti', traitKey: 'TF',
  },
  {
    id: 'Q42', slug: 'mbti-jp-1', title: 'Lists or memory', kind: 'choice', choiceMode: 'scale',
    prompt: 'Which describes you better?',
    left: 'Make lists',
    right: 'Rely on memory',
    reportKey: 'mbti', traitKey: 'JP',
  },
  {
    id: 'Q43', slug: 'mbti-jp-2', title: 'Plan ahead', kind: 'choice', choiceMode: 'scale',
    prompt: 'Which describes you better?',
    left: 'Plan far ahead',
    right: 'Plan at the last minute',
    reportKey: 'mbti', traitKey: 'JP',
  },
  {
    id: 'Q44', slug: 'mbti-jp-3', title: 'Options or commit', kind: 'choice', choiceMode: 'scale',
    prompt: 'Which describes you better?',
    left: 'Commit',
    right: 'Keep options open',
    // left = commit (J), right = keep options open (P) → 5 == P, no reverse.
    reportKey: 'mbti', traitKey: 'JP',
  },
  {
    id: 'Q45', slug: 'mbti-jp-4', title: 'Prepare or improvise', kind: 'choice', choiceMode: 'scale',
    prompt: 'Which describes you better?',
    left: 'Prepare',
    right: 'Improvise',
    // left = prepare (J), right = improvise (P) → 5 == P, no reverse.
    reportKey: 'mbti', traitKey: 'JP',
  },

  // ==========================================================================
  // EXPANSION ITEMS (Q46+) — more items per axis for a steadier score.
  //
  // Two scale items beat one (a single Likert pick is noisy; averaging two
  // independent phrasings of the same trait cancels item-specific quirks). The
  // scorer already averages all items sharing a (reportKey, traitKey) for
  // big-five, and honesty-tone now averages all items sharing an axis key.
  // ==========================================================================

  // --- Big Five — a third item per trait (BFI-style adjectives, distinct
  // from the TIPI pair so we're not re-asking the same words). -------------
  {
    id: 'Q46',
    slug: 'bfi-openness',
    title: 'Imagination',
    prompt: 'I see myself as imaginative, full of ideas.',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Not at all',
    right: 'Very much',
    reportKey: 'big-five', traitKey: 'O',
  },
  {
    id: 'Q47',
    slug: 'bfi-conscientiousness',
    title: 'Follow-through',
    prompt: 'I see myself as someone who finishes what I start and tends to tasks right away.',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Not at all',
    right: 'Very much',
    reportKey: 'big-five', traitKey: 'C',
  },
  {
    id: 'Q48',
    slug: 'bfi-extraversion',
    title: 'Starting conversations',
    prompt: 'I see myself as someone who starts conversations and feels at home around people.',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Not at all',
    right: 'Very much',
    reportKey: 'big-five', traitKey: 'E',
  },
  {
    id: 'Q49',
    slug: 'bfi-agreeableness',
    title: 'Considerate of others',
    prompt: "I see myself as someone who takes time for others and feels their emotions.",
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Not at all',
    right: 'Very much',
    reportKey: 'big-five', traitKey: 'A',
  },
  {
    id: 'Q50',
    slug: 'bfi-neuroticism',
    title: 'Worry',
    prompt: 'I see myself as someone who worries about things and is easily stressed.',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Not at all',
    right: 'Very much',
    reportKey: 'big-five', traitKey: 'N',
  },

  // A fourth Big Five item per trait, worded from the Mini-IPIP (Donnellan
  // et al. 2006) — explicitly public domain (ipip.ori.org). Four items per
  // trait is the practical floor for individual-level reliability; the biggest
  // jump (Spearman-Brown) is from 2 → 4 items, so this is the high-leverage add.
  {
    id: 'Q57',
    slug: 'ipip-openness',
    title: 'Abstract ideas',
    prompt: 'I enjoy thinking about abstract ideas.',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Not at all',
    right: 'Very much',
    reportKey: 'big-five', traitKey: 'O',
  },
  {
    id: 'Q58',
    slug: 'ipip-conscientiousness',
    title: 'Keeping order',
    prompt: 'I like order and put things back in their place.',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Not at all',
    right: 'Very much',
    reportKey: 'big-five', traitKey: 'C',
  },
  {
    id: 'Q59',
    slug: 'ipip-extraversion-r',
    title: 'Keeping to myself',
    prompt: 'I tend to keep in the background and stay quiet.',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Not at all',
    right: 'Very much',
    reportKey: 'big-five', traitKey: 'E', reverse: true,
  },
  {
    id: 'Q60',
    slug: 'ipip-agreeableness-r',
    title: 'Interest in others',
    prompt: "I'm not all that interested in other people's problems.",
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Not at all',
    right: 'Very much',
    reportKey: 'big-five', traitKey: 'A', reverse: true,
  },
  {
    id: 'Q61',
    slug: 'ipip-neuroticism',
    title: 'Mood swings',
    prompt: 'I have frequent mood swings and get upset easily.',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Not at all',
    right: 'Very much',
    reportKey: 'big-five', traitKey: 'N',
  },

  // --- Honesty-Humility + tone — a second item per axis. The scorer
  // averages each axis across all items carrying its `toneAxis` key. ---------
  {
    id: 'Q51',
    slug: 'tone-modesty-2',
    title: 'Sharing wins',
    prompt: 'When something goes well for me, I…',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Keep it low-key',
    right: 'Make sure people know',
    reportKey: 'honesty-tone', toneAxis: 'modesty',
    hint: 'No "right" answer — describe your actual lean.',
  },
  {
    id: 'Q52',
    slug: 'tone-rapport-2',
    title: 'What a message is for',
    prompt: 'A message I send is more about…',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'The relationship',
    right: 'Getting the facts across',
    reportKey: 'honesty-tone', toneAxis: 'rapport',
  },
  {
    id: 'Q53',
    slug: 'tone-formality-2',
    title: 'Word choice',
    prompt: 'My everyday word choice in writing leans…',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Loose / slangy',
    right: 'Careful / proper',
    reportKey: 'honesty-tone', toneAxis: 'formality',
  },
  {
    id: 'Q54',
    slug: 'tone-seriousness-2',
    title: 'Joking around',
    prompt: 'How often a joke slips into my writing…',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Constantly',
    right: 'Rarely',
    reportKey: 'honesty-tone', toneAxis: 'seriousness',
  },
  {
    id: 'Q55',
    slug: 'tone-irreverence-2',
    title: 'Sacred cows',
    prompt: 'Toward conventions and authority, I write more…',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Deferential',
    right: 'Cheeky',
    reportKey: 'honesty-tone', toneAxis: 'irreverence',
  },
  {
    id: 'Q56',
    slug: 'tone-enthusiasm-2',
    title: 'Punctuation energy',
    prompt: 'My writing tends to run…',
    kind: 'choice',
    choiceMode: 'scale',
    left: 'Understated',
    right: 'Exclamation-marks-and-caps',
    reportKey: 'honesty-tone', toneAxis: 'enthusiasm',
  },

  // ==========================================================================
  // NEED FOR COGNITION — NCS-6 (Coelho, Hanel & Wolf 2018; CC BY 4.0).
  // How much someone enjoys effortful, analytical thinking. Predicts how they
  // WRITE: high → elaboration, abstraction, qualification; low → concise and
  // concrete. Scale 1 = very uncharacteristic .. 5 = very characteristic.
  // ==========================================================================
  {
    id: 'Q62', slug: 'ncs-complex', title: 'Complex problems',
    prompt: 'I would prefer complex problems to simple ones.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Very unlike me', right: 'Very like me',
    reportKey: 'need-for-cognition',
  },
  {
    id: 'Q63', slug: 'ncs-responsibility', title: 'Heavy thinking',
    prompt: 'I like having the responsibility of handling a situation that needs a lot of thinking.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Very unlike me', right: 'Very like me',
    reportKey: 'need-for-cognition',
  },
  {
    id: 'Q64', slug: 'ncs-fun-r', title: 'Thinking for fun',
    prompt: 'Thinking is not my idea of fun.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Very unlike me', right: 'Very like me',
    reportKey: 'need-for-cognition', reverse: true,
  },
  {
    id: 'Q65', slug: 'ncs-little-thought-r', title: 'Avoiding hard thought',
    prompt: 'I would rather do something that needs little thought than something sure to challenge my thinking.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Very unlike me', right: 'Very like me',
    reportKey: 'need-for-cognition', reverse: true,
  },
  {
    id: 'Q66', slug: 'ncs-new-solutions', title: 'New solutions',
    prompt: 'I really enjoy a task that involves coming up with new solutions to problems.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Very unlike me', right: 'Very like me',
    reportKey: 'need-for-cognition',
  },
  {
    id: 'Q67', slug: 'ncs-intellectual', title: 'Intellectual challenge',
    prompt: 'I prefer a task that is intellectual and difficult to one that is easy but unimportant.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Very unlike me', right: 'Very like me',
    reportKey: 'need-for-cognition',
  },

  // ==========================================================================
  // SCHWARTZ VALUES — TIVI (Sandy/Gosling/Schwartz 2016; public domain).
  // Ten "how much is this person like you?" portraits, one per basic value.
  // The scorer ranks them — high values are what a person writes ABOUT and the
  // moral vocabulary they reach for. Scale 1 = not like me .. 5 = very like me.
  // (Original uses a 6-point scale; we keep the platform's 5-point track.)
  // ==========================================================================
  {
    id: 'Q68', slug: 'tivi-self-direction', title: 'Curiosity & ideas',
    prompt: 'Thinking up new ideas and being curious matter to them; they like to understand things their own way.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Not like me', right: 'Very like me',
    reportKey: 'values', valueKey: 'self-direction',
  },
  {
    id: 'Q69', slug: 'tivi-stimulation', title: 'Adventure',
    prompt: 'They like to take risks and are always looking for adventures and new things to try.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Not like me', right: 'Very like me',
    reportKey: 'values', valueKey: 'stimulation',
  },
  {
    id: 'Q70', slug: 'tivi-hedonism', title: 'Enjoying life',
    prompt: 'Having a good time and enjoying life’s pleasures is important to them.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Not like me', right: 'Very like me',
    reportKey: 'values', valueKey: 'hedonism',
  },
  {
    id: 'Q71', slug: 'tivi-achievement', title: 'Getting ahead',
    prompt: 'Getting ahead and being successful matters to them; they strive to do better than others.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Not like me', right: 'Very like me',
    reportKey: 'values', valueKey: 'achievement',
  },
  {
    id: 'Q72', slug: 'tivi-power', title: 'Being in charge',
    prompt: 'They want to be the one who decides and leads, and to have influence over others.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Not like me', right: 'Very like me',
    reportKey: 'values', valueKey: 'power',
  },
  {
    id: 'Q73', slug: 'tivi-security', title: 'Order & safety',
    prompt: 'They want things organized and stable, and value safety and a predictable order.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Not like me', right: 'Very like me',
    reportKey: 'values', valueKey: 'security',
  },
  {
    id: 'Q74', slug: 'tivi-conformity', title: 'Behaving properly',
    prompt: 'It matters to them to behave properly and avoid doing anything others would say is wrong.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Not like me', right: 'Very like me',
    reportKey: 'values', valueKey: 'conformity',
  },
  {
    id: 'Q75', slug: 'tivi-tradition', title: 'Tradition',
    prompt: 'They value keeping customs and doing things in the traditional, time-honored way.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Not like me', right: 'Very like me',
    reportKey: 'values', valueKey: 'tradition',
  },
  {
    id: 'Q76', slug: 'tivi-benevolence', title: 'Caring for close others',
    prompt: 'Helping the people around them and caring for their well-being is important to them.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Not like me', right: 'Very like me',
    reportKey: 'values', valueKey: 'benevolence',
  },
  {
    id: 'Q77', slug: 'tivi-universalism', title: 'Fairness for all',
    prompt: 'They believe everyone in the world should be treated equally and live in harmony.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Not like me', right: 'Very like me',
    reportKey: 'values', valueKey: 'universalism',
  },

  // ==========================================================================
  // REGULATORY FOCUS — short RFQ (Higgins et al. 2001; freely distributed).
  // Promotion (chasing gains, ideals, growth) vs prevention (avoiding loss,
  // duties, safety) — shows up in how someone FRAMES things. We use the most
  // face-valid items and drop the dated childhood-rule items. Averaged per
  // focus; the two are scored independently (not a single bipolar axis).
  // Scale 1 = never/seldom or false .. 5 = very often or true.
  // ==========================================================================
  {
    id: 'Q78', slug: 'rfq-prom-psyched', title: 'Psyched to push harder',
    prompt: 'I have often accomplished things that got me psyched to work even harder.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Almost never', right: 'Very often',
    reportKey: 'regulatory-focus', focusKey: 'promotion',
  },
  {
    id: 'Q79', slug: 'rfq-prom-well', title: 'Doing well at what I try',
    prompt: 'I usually do well at the different things I try.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Almost never', right: 'Very often',
    reportKey: 'regulatory-focus', focusKey: 'promotion',
  },
  {
    id: 'Q80', slug: 'rfq-prom-progress', title: 'Progress toward success',
    prompt: 'I feel I have made progress toward being successful in my life.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Certainly false', right: 'Certainly true',
    reportKey: 'regulatory-focus', focusKey: 'promotion',
  },
  {
    id: 'Q81', slug: 'rfq-prom-ideal-r', title: 'Falling short of the ideal',
    prompt: "On things that matter to me, I don't perform as well as I'd ideally like to.",
    kind: 'choice', choiceMode: 'scale',
    left: 'Certainly false', right: 'Certainly true',
    reportKey: 'regulatory-focus', focusKey: 'promotion', reverse: true,
  },
  {
    id: 'Q82', slug: 'rfq-prev-careful', title: 'Carefulness',
    prompt: 'Not being careful enough has gotten me into trouble at times.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Almost never', right: 'Very often',
    reportKey: 'regulatory-focus', focusKey: 'prevention', reverse: true,
  },
  {
    id: 'Q83', slug: 'rfq-prev-rules', title: 'Following the rules',
    prompt: 'I am the kind of person who follows rules and plays it safe.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Almost never', right: 'Very often',
    reportKey: 'regulatory-focus', focusKey: 'prevention',
  },
  {
    id: 'Q84', slug: 'rfq-prev-avoid-loss', title: 'Guarding against loss',
    prompt: 'I often think about how to prevent bad things from happening to me.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Almost never', right: 'Very often',
    reportKey: 'regulatory-focus', focusKey: 'prevention',
  },
  {
    id: 'Q85', slug: 'rfq-prev-duty', title: 'Duties & obligations',
    prompt: 'I am usually focused on the duties and responsibilities I have to meet.',
    kind: 'choice', choiceMode: 'scale',
    left: 'Almost never', right: 'Very often',
    reportKey: 'regulatory-focus', focusKey: 'prevention',
  },

  // ==========================================================================
  // LOCUS OF CONTROL — IE-4 (Kovaleva et al.; open access). Internal (own
  // effort drives outcomes) vs external (others/fate do). Surfaces as agentive,
  // active narration vs passive, circumstance-driven narration. Two independent
  // 2-item scores. Scale 1 = doesn't apply .. 5 = applies completely.
  // ==========================================================================
  {
    id: 'Q86', slug: 'iec-own-boss', title: 'My own boss',
    prompt: "I'm my own boss.",
    kind: 'choice', choiceMode: 'scale',
    left: "Doesn't apply", right: 'Applies fully',
    reportKey: 'locus-of-control', locusKey: 'internal',
  },
  {
    id: 'Q87', slug: 'iec-work-hard', title: 'Effort pays off',
    prompt: 'If I work hard, I will succeed.',
    kind: 'choice', choiceMode: 'scale',
    left: "Doesn't apply", right: 'Applies fully',
    reportKey: 'locus-of-control', locusKey: 'internal',
  },
  {
    id: 'Q88', slug: 'iec-others-decide', title: 'Others decide for me',
    prompt: 'What I do is mainly determined by other people.',
    kind: 'choice', choiceMode: 'scale',
    left: "Doesn't apply", right: 'Applies fully',
    reportKey: 'locus-of-control', locusKey: 'external',
  },
  {
    id: 'Q89', slug: 'iec-fate', title: 'Fate intervenes',
    prompt: 'Fate often gets in the way of my plans.',
    kind: 'choice', choiceMode: 'scale',
    left: "Doesn't apply", right: 'Applies fully',
    reportKey: 'locus-of-control', locusKey: 'external',
  },
];
