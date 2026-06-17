// The questionnaire — see corpus/wiki/sources-raw/02-questionnaire-design.md for
// the rationale behind each question, and
// corpus/wiki/sources-raw/01-research-synthesis.md for the research that led to
// the minimum-set shape.

// A single selectable option for a choice question. `value` is the stable,
// language-neutral token persisted in the answer body and consumed by the
// scorer; the user only ever sees the localized label. For Likert-style scale
// questions the values are numeric strings "1".."5" (1 = leftRo/leftEn pole).
export interface Choice {
  value: string;
  labelRo: string;
  labelEn: string;
}

// Which family of report a choice question feeds, so the scorer can group the
// answers it needs without re-deriving the mapping from question ids.
export type ReportKey = 'big-five' | 'honesty-tone' | 'pcm' | 'mbti';

export interface Question {
  id: string;
  slug: string;
  title: string;
  promptRo: string;
  promptEn: string;
  hintRo?: string;
  hintEn?: string;
  optional?: boolean;

  // --- Choice questions (trait profiling) ---------------------------------
  // A question is free-text unless `kind: 'choice'`. Free-text questions keep
  // exactly the shape they had before this field existed, so Q1..Q12 are
  // unchanged and the answers.md contract is untouched.
  kind?: 'text' | 'choice';
  // 'scale'  → 5-point bipolar Likert, rendered as a single labeled track
  //            (leftLabel..rightLabel); value is "1".."5".
  // 'single' → pick exactly one of `choices`.
  choiceMode?: 'scale' | 'single';
  choices?: ReadonlyArray<Choice>;
  // Pole labels for a 'scale' question (value 1 = left, value 5 = right).
  leftRo?: string;
  leftEn?: string;
  rightRo?: string;
  rightEn?: string;

  // --- Scoring metadata (choice questions only) ---------------------------
  reportKey?: ReportKey;
  // For big-five: the trait this item loads on. For mbti: the axis.
  traitKey?: 'O' | 'C' | 'E' | 'A' | 'N' | 'EI' | 'SN' | 'TF' | 'JP';
  // Reverse-key a scale item before averaging (TIPI items 2,4,6,8,10; some
  // OEJTS pairs whose poles are flipped relative to the axis direction).
  reverse?: boolean;
}

export const QUESTIONS: ReadonlyArray<Question> = [
  {
    id: 'Q1',
    slug: 'recurring-frustration',
    title: 'Recurring frustration',
    promptRo:
      'Descrie o frustrare care îți revine constant în viață — varsă-ți năduful ca în fața unui prieten apropiat.',
    promptEn:
      'Describe a recurring frustration in your life — vent it like you would to a close friend.',
    hintRo: 'Scrie cât vrei. Tonul informal e binevenit.',
    hintEn: 'Write as much as you want. Informal tone is welcome.',
  },
  {
    id: 'Q2',
    slug: 'hidden-passion',
    title: 'Hidden passion',
    promptRo:
      'Povestește-mi despre ceva care te pasionează și nu prea împărtășesc cei din jur. De ce contează pentru tine?',
    promptEn:
      "Tell me about something you're passionate about that few people around you share. Why does it matter?",
    hintRo: 'Spune ce te-a atras prima dată și de ce ține pasiunea asta.',
    hintEn: 'Say what first drew you in and why it has stuck.',
  },
  {
    id: 'Q3',
    slug: 'belief-asymmetry',
    title: 'Belief asymmetry',
    promptRo:
      'Care e o convingere pe care o ai, dar pe care majoritatea celor din jur nu o împărtășesc? Nu trebuie să o aperi.',
    promptEn:
      "What's a belief you hold that most people around you don't? You don't have to defend it.",
    hintRo: 'Nu trebuie să convingi pe nimeni — spune doar cum sună în capul tău.',
    hintEn: "No need to convince anyone — just say how it sounds in your head.",
  },
  {
    id: 'Q4',
    slug: 'narrative-identity',
    title: 'Narrative identity',
    promptRo:
      'Povestește o dată când ceva a mers prost și ce a ieșit până la urmă. Scrie ca și cum i-ai povesti unui prieten apropiat.',
    promptEn:
      "Tell me about a time something went wrong and what came of it. Write it the way you'd tell a close friend.",
    hintRo: 'Lasă povestea să curgă — context, ce s-a întâmplat, cum a ieșit.',
    hintEn: 'Let the story run — the setup, what happened, how it ended up.',
  },
  {
    id: 'Q5',
    slug: 'code-switching',
    title: 'Code-switching range',
    promptRo:
      'Cum scrii diferit cu: (a) un prieten apropiat, (b) un coleg de la muncă, (c) un necunoscut căruia trebuie să-i fii politicos?',
    promptEn:
      'How would you describe how you write differently to: (a) a close friend, (b) a colleague at work, (c) a stranger you\'re being polite to?',
    hintRo: 'Exemple concrete ajută — un mesaj tipic pentru fiecare.',
    hintEn: 'Concrete examples help — a typical message for each.',
  },
  {
    id: 'Q6',
    slug: 'rapport-vs-report',
    title: 'Connect or inform',
    promptRo:
      'Când scrii, încerci mai des să te conectezi cu cineva sau să-l informezi? Sunt contexte în care lucrurile se inversează?',
    promptEn:
      'When you write, are you more often trying to connect with someone or to inform them? Are there contexts where this flips?',
    hintRo: 'Dacă se schimbă după situație, spune când și de ce.',
    hintEn: 'If it shifts by situation, say when and why.',
  },
  {
    id: 'Q7',
    slug: 'humor-style',
    title: 'Humor style',
    promptRo: 'Umorul tău — când apare, ce aromă are? Exemple sunt binevenite.',
    promptEn:
      'Your humor — when it shows up, what flavor is it? Examples welcome.',
    hintRo: 'Un exemplu de glumă sau de moment care ți s-a părut amuzant.',
    hintEn: 'An example joke or a moment you found funny.',
  },
  {
    id: 'Q8',
    slug: 'self-perception-gap',
    title: 'Self-perception vs. actual',
    promptRo:
      'Cum ai VREA să pari când scrii? Unde se rupe asta de felul în care scrii de fapt?',
    promptEn:
      'How would you LIKE to come across in writing? Where does it diverge from how you actually write?',
    hintRo: 'Fii sincer despre diferența dintre intenție și rezultat.',
    hintEn: 'Be honest about the gap between intention and result.',
  },
  {
    id: 'Q9',
    slug: 'core-want-fear',
    title: 'Core want / core fear',
    promptRo:
      'Completează sincer: Cel mai mult vreau să fiu văzut ca ____, și cel mai mult mă tem să fiu văzut ca ____.',
    promptEn:
      'Finish this honestly: I most want to be seen as ____, and I most fear being seen as ____.',
    hintRo: 'Poți să te și extinzi după ce completezi — de ce anume astea.',
    hintEn: 'Feel free to expand after filling the blanks — why these.',
  },
  {
    id: 'Q10',
    slug: 'aspirational-style-sample',
    title: 'Aspirational style sample',
    promptRo:
      'Scrie 3–4 propoziții într-un stil pe care îl admiri — al oricui, real sau ficțional. Apoi pe scurt: de ce acel stil?',
    promptEn:
      'Write 3–4 sentences in a style you admire — anyone, real or fictional. Then briefly: why that style?',
    hintRo: 'Scrie chiar în acel stil, nu doar despre el.',
    hintEn: 'Actually write in that style, not just about it.',
  },
  {
    id: 'Q11',
    slug: 'existing-self-knowledge',
    title: 'Existing self-knowledge (optional)',
    promptRo:
      'Dacă ai făcut vreodată MBTI / 16personalities / Enneagram și un rezultat ți s-a părut că te descrie corect, care a fost și ce anume a sunat adevărat?',
    promptEn:
      "If you've ever taken MBTI / 16personalities / Enneagram and a result felt accurate, what was it and what felt right?",
    hintRo: 'Sari peste dacă nu te regăsești în nicio etichetă.',
    hintEn: "Skip if none feel like a fit.",
    optional: true,
  },
  {
    id: 'Q12',
    slug: 'narrative-high-point',
    title: 'Narrative high point',
    promptRo:
      'Povestește o dată când ceva a mers chiar bine — ceva de care ești mândru. Scrie ca și cum i-ai povesti unui prieten apropiat.',
    promptEn:
      "Tell me about a time something went really right — something you're proud of. Write it the way you'd tell a close friend.",
    hintRo: 'Lasă povestea să curgă — ce ai făcut tu, cum s-a simțit.',
    hintEn: "Let the story run — what you did, how it felt.",
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
    promptRo: 'Mă văd ca o persoană extravertită, entuziastă.',
    promptEn: 'I see myself as extraverted, enthusiastic.',
    kind: 'choice',
    choiceMode: 'scale',
    leftRo: 'Deloc', leftEn: 'Not at all',
    rightRo: 'Întru totul', rightEn: 'Very much',
    reportKey: 'big-five', traitKey: 'E',
  },
  {
    id: 'Q14',
    slug: 'tipi-extraversion-r',
    title: 'Reserve',
    promptRo: 'Mă văd ca o persoană rezervată, tăcută.',
    promptEn: 'I see myself as reserved, quiet.',
    kind: 'choice',
    choiceMode: 'scale',
    leftRo: 'Deloc', leftEn: 'Not at all',
    rightRo: 'Întru totul', rightEn: 'Very much',
    reportKey: 'big-five', traitKey: 'E', reverse: true,
  },
  {
    id: 'Q15',
    slug: 'tipi-agreeableness',
    title: 'Warmth',
    promptRo: 'Mă văd ca o persoană empatică, caldă.',
    promptEn: 'I see myself as sympathetic, warm.',
    kind: 'choice',
    choiceMode: 'scale',
    leftRo: 'Deloc', leftEn: 'Not at all',
    rightRo: 'Întru totul', rightEn: 'Very much',
    reportKey: 'big-five', traitKey: 'A',
  },
  {
    id: 'Q16',
    slug: 'tipi-agreeableness-r',
    title: 'Bluntness',
    promptRo: 'Mă văd ca o persoană critică, certăreață.',
    promptEn: 'I see myself as critical, quarrelsome.',
    kind: 'choice',
    choiceMode: 'scale',
    leftRo: 'Deloc', leftEn: 'Not at all',
    rightRo: 'Întru totul', rightEn: 'Very much',
    reportKey: 'big-five', traitKey: 'A', reverse: true,
  },
  {
    id: 'Q17',
    slug: 'tipi-conscientiousness',
    title: 'Dependability',
    promptRo: 'Mă văd ca o persoană de încredere, disciplinată.',
    promptEn: 'I see myself as dependable, self-disciplined.',
    kind: 'choice',
    choiceMode: 'scale',
    leftRo: 'Deloc', leftEn: 'Not at all',
    rightRo: 'Întru totul', rightEn: 'Very much',
    reportKey: 'big-five', traitKey: 'C',
  },
  {
    id: 'Q18',
    slug: 'tipi-conscientiousness-r',
    title: 'Looseness',
    promptRo: 'Mă văd ca o persoană dezorganizată, neglijentă.',
    promptEn: 'I see myself as disorganized, careless.',
    kind: 'choice',
    choiceMode: 'scale',
    leftRo: 'Deloc', leftEn: 'Not at all',
    rightRo: 'Întru totul', rightEn: 'Very much',
    reportKey: 'big-five', traitKey: 'C', reverse: true,
  },
  {
    id: 'Q19',
    slug: 'tipi-stability',
    title: 'Even keel',
    promptRo: 'Mă văd ca o persoană calmă, stabilă emoțional.',
    promptEn: 'I see myself as calm, emotionally stable.',
    kind: 'choice',
    choiceMode: 'scale',
    leftRo: 'Deloc', leftEn: 'Not at all',
    rightRo: 'Întru totul', rightEn: 'Very much',
    // TIPI scores "Emotional Stability"; we report Neuroticism, so the
    // stability item is the reverse-keyed one for N.
    reportKey: 'big-five', traitKey: 'N', reverse: true,
  },
  {
    id: 'Q20',
    slug: 'tipi-neuroticism',
    title: 'Easily rattled',
    promptRo: 'Mă văd ca o persoană anxioasă, ușor de tulburat.',
    promptEn: 'I see myself as anxious, easily upset.',
    kind: 'choice',
    choiceMode: 'scale',
    leftRo: 'Deloc', leftEn: 'Not at all',
    rightRo: 'Întru totul', rightEn: 'Very much',
    reportKey: 'big-five', traitKey: 'N',
  },
  {
    id: 'Q21',
    slug: 'tipi-openness',
    title: 'Open to the new',
    promptRo: 'Mă văd ca o persoană deschisă la nou, cu gândire complexă.',
    promptEn: 'I see myself as open to new experiences, complex.',
    kind: 'choice',
    choiceMode: 'scale',
    leftRo: 'Deloc', leftEn: 'Not at all',
    rightRo: 'Întru totul', rightEn: 'Very much',
    reportKey: 'big-five', traitKey: 'O',
  },
  {
    id: 'Q22',
    slug: 'tipi-openness-r',
    title: 'Conventional',
    promptRo: 'Mă văd ca o persoană convențională, puțin creativă.',
    promptEn: 'I see myself as conventional, uncreative.',
    kind: 'choice',
    choiceMode: 'scale',
    leftRo: 'Deloc', leftEn: 'Not at all',
    rightRo: 'Întru totul', rightEn: 'Very much',
    reportKey: 'big-five', traitKey: 'O', reverse: true,
  },

  // --- Honesty-Humility + tone (HEXACO-H modesty + NN/g tone + Tannen) ------
  // Grouped into one report because they all describe self-presentation /
  // register. Scored as independent axes (no averaging across them).
  {
    id: 'Q23',
    slug: 'hexaco-modesty',
    title: 'Modesty vs. self-promotion',
    promptRo: 'Când scriu despre mine și realizările mele, tind să…',
    promptEn: 'When I write about myself and my achievements, I tend to…',
    kind: 'choice',
    choiceMode: 'scale',
    leftRo: 'Mă subestimez / las faptele să vorbească',
    leftEn: 'Understate / let the work speak',
    rightRo: 'Îmi scot în evidență meritele',
    rightEn: 'Put my merits forward',
    reportKey: 'honesty-tone', traitKey: undefined,
    hintRo: 'Nu există răspuns „corect" — descrie tendința ta reală.',
    hintEn: 'No "right" answer — describe your actual lean.',
  },
  {
    id: 'Q24',
    slug: 'tannen-rapport-report',
    title: 'Connect vs. inform',
    promptRo: 'Când scriu, de cele mai multe ori încerc să…',
    promptEn: 'When I write, I most often try to…',
    kind: 'choice',
    choiceMode: 'scale',
    leftRo: 'Mă conectez cu omul', leftEn: 'Connect with the person',
    rightRo: 'Transmit informația', rightEn: 'Inform them',
  },
  {
    id: 'Q25',
    slug: 'tone-formal-casual',
    title: 'Formal vs. casual',
    promptRo: 'Tonul meu implicit în scris e mai degrabă…',
    promptEn: 'My default tone in writing is more…',
    kind: 'choice',
    choiceMode: 'scale',
    leftRo: 'Relaxat / familiar', leftEn: 'Casual',
    rightRo: 'Formal', rightEn: 'Formal',
  },
  {
    id: 'Q26',
    slug: 'tone-serious-funny',
    title: 'Serious vs. playful',
    promptRo: 'În scris înclin spre…',
    promptEn: 'In writing I lean toward…',
    kind: 'choice',
    choiceMode: 'scale',
    leftRo: 'Jucăuș / glumeț', leftEn: 'Playful / funny',
    rightRo: 'Serios', rightEn: 'Serious',
  },
  {
    id: 'Q27',
    slug: 'tone-respectful-irreverent',
    title: 'Respectful vs. irreverent',
    promptRo: 'Față de subiect și de cititor, sunt mai degrabă…',
    promptEn: 'Toward the subject and the reader, I am more…',
    kind: 'choice',
    choiceMode: 'scale',
    leftRo: 'Respectuos', leftEn: 'Respectful',
    rightRo: 'Irreverent / obraznic', rightEn: 'Irreverent',
  },
  {
    id: 'Q28',
    slug: 'tone-matteroffact-enthusiastic',
    title: 'Matter-of-fact vs. enthusiastic',
    promptRo: 'Energia scrisului meu e mai degrabă…',
    promptEn: 'The energy of my writing is more…',
    kind: 'choice',
    choiceMode: 'scale',
    leftRo: 'Factuală / sobră', leftEn: 'Matter-of-fact',
    rightRo: 'Entuziastă', rightEn: 'Enthusiastic',
  },

  // --- PCM perceptual frame (Kahler; framework-inspired, single-select) -----
  {
    id: 'Q29',
    slug: 'pcm-perceptual-frame',
    title: 'Your first filter',
    promptRo: 'Când se întâmplă ceva, primul tău filtru e de obicei…',
    promptEn: 'When something happens, your first filter is usually…',
    kind: 'choice',
    choiceMode: 'single',
    reportKey: 'pcm',
    choices: [
      { value: 'thoughts', labelRo: 'Un gând — analizez faptele, logica situației', labelEn: 'A thought — I analyze the facts and logic' },
      { value: 'opinions', labelRo: 'O opinie — o judec după valorile și principiile mele', labelEn: 'An opinion — I judge it against my values' },
      { value: 'emotions', labelRo: 'O emoție — simt ce înseamnă pentru oamenii implicați', labelEn: 'An emotion — I feel what it means for people' },
      { value: 'reactions', labelRo: 'O reacție — îmi place sau nu, imediat, din burtă', labelEn: 'A reaction — an immediate gut like/dislike' },
      { value: 'actions', labelRo: 'O acțiune — văd ce e de făcut și pornesc', labelEn: 'An action — I see what to do and start' },
      { value: 'reflections', labelRo: 'O reflecție — mă retrag și observ înainte să răspund', labelEn: 'A reflection — I step back and observe first' },
    ],
  },

  // --- MBTI (OEJTS items, open source; NOT trademarked MBTI items) ----------
  // 16 items, 4 per axis. Scale value 1 = LEFT word, 5 = RIGHT word.
  // `reverse: true` where the OEJTS pair's left word is the SECOND axis pole,
  // so the scorer can treat 5 == second-letter consistently per axis.
  // Axis second-letter convention: EI→I, SN→N, TF→F, JP→P.
  {
    id: 'Q30', slug: 'mbti-ei-1', title: 'Time alone', kind: 'choice', choiceMode: 'scale',
    promptRo: 'Care te descrie mai bine?', promptEn: 'Which describes you better?',
    leftRo: 'Mă plictisesc singur', leftEn: 'Bored by time alone',
    rightRo: 'Am nevoie de timp singur', rightEn: 'Need time alone',
    reportKey: 'mbti', traitKey: 'EI',
  },
  {
    id: 'Q31', slug: 'mbti-ei-2', title: 'Work setting', kind: 'choice', choiceMode: 'scale',
    promptRo: 'Care te descrie mai bine?', promptEn: 'Which describes you better?',
    leftRo: 'Lucrez cel mai bine în grup', leftEn: 'Work best in groups',
    rightRo: 'Lucrez cel mai bine singur', rightEn: 'Work best alone',
    reportKey: 'mbti', traitKey: 'EI',
  },
  {
    id: 'Q32', slug: 'mbti-ei-3', title: 'Talk or listen', kind: 'choice', choiceMode: 'scale',
    promptRo: 'Care te descrie mai bine?', promptEn: 'Which describes you better?',
    leftRo: 'Vorbesc mai mult', leftEn: 'Talk more',
    rightRo: 'Ascult mai mult', rightEn: 'Listen more',
    reportKey: 'mbti', traitKey: 'EI',
  },
  {
    id: 'Q33', slug: 'mbti-ei-4', title: 'Parties', kind: 'choice', choiceMode: 'scale',
    promptRo: 'Care te descrie mai bine?', promptEn: 'Which describes you better?',
    leftRo: 'Petrecerile mă încarcă', leftEn: 'Parties fire me up',
    rightRo: 'Petrecerile mă consumă', rightEn: 'Parties wear me out',
    // left here = E (fired up), so 5 (right) = I already → no reverse.
    reportKey: 'mbti', traitKey: 'EI',
  },
  {
    id: 'Q34', slug: 'mbti-sn-1', title: 'Past or future', kind: 'choice', choiceMode: 'scale',
    promptRo: 'Care te descrie mai bine?', promptEn: 'Which describes you better?',
    leftRo: 'Concentrat pe trecut', leftEn: 'Focused on the past',
    rightRo: 'Concentrat pe viitor', rightEn: 'Focused on the future',
    reportKey: 'mbti', traitKey: 'SN',
  },
  {
    id: 'Q35', slug: 'mbti-sn-2', title: 'Detail or big picture', kind: 'choice', choiceMode: 'scale',
    promptRo: 'Care te descrie mai bine?', promptEn: 'Which describes you better?',
    leftRo: 'Vreau detaliile', leftEn: 'Want the details',
    rightRo: 'Vreau imaginea de ansamblu', rightEn: 'Want the big picture',
    reportKey: 'mbti', traitKey: 'SN',
  },
  {
    id: 'Q36', slug: 'mbti-sn-3', title: 'What or why', kind: 'choice', choiceMode: 'scale',
    promptRo: 'Care te descrie mai bine?', promptEn: 'Which describes you better?',
    leftRo: 'Ce s-a întâmplat', leftEn: 'What happened',
    rightRo: 'Ce a însemnat', rightEn: 'What it meant',
    reportKey: 'mbti', traitKey: 'SN',
  },
  {
    id: 'Q37', slug: 'mbti-sn-4', title: 'Empirical or theoretical', kind: 'choice', choiceMode: 'scale',
    promptRo: 'Care te descrie mai bine?', promptEn: 'Which describes you better?',
    leftRo: 'Empiric / concret', leftEn: 'Empirical',
    rightRo: 'Teoretic / abstract', rightEn: 'Theoretical',
    reportKey: 'mbti', traitKey: 'SN',
  },
  {
    id: 'Q38', slug: 'mbti-tf-1', title: 'Head or heart', kind: 'choice', choiceMode: 'scale',
    promptRo: 'Care te descrie mai bine?', promptEn: 'Which describes you better?',
    leftRo: 'Urmez rațiunea', leftEn: 'Follow the head',
    rightRo: 'Urmez inima', rightEn: 'Follow the heart',
    reportKey: 'mbti', traitKey: 'TF',
  },
  {
    id: 'Q39', slug: 'mbti-tf-2', title: 'Justice or compassion', kind: 'choice', choiceMode: 'scale',
    promptRo: 'Care te descrie mai bine?', promptEn: 'Which describes you better?',
    leftRo: 'Morala pe dreptate', leftEn: 'Morality on justice',
    rightRo: 'Morala pe compasiune', rightEn: 'Morality on compassion',
    reportKey: 'mbti', traitKey: 'TF',
  },
  {
    id: 'Q40', slug: 'mbti-tf-3', title: 'Respect or love', kind: 'choice', choiceMode: 'scale',
    promptRo: 'Care te descrie mai bine?', promptEn: 'Which describes you better?',
    leftRo: 'Vreau respectul oamenilor', leftEn: "Want people's respect",
    rightRo: 'Vreau afecțiunea lor', rightEn: 'Want their love',
    reportKey: 'mbti', traitKey: 'TF',
  },
  {
    id: 'Q41', slug: 'mbti-tf-4', title: 'Emotions', kind: 'choice', choiceMode: 'scale',
    promptRo: 'Care te descrie mai bine?', promptEn: 'Which describes you better?',
    leftRo: 'Incomod cu emoțiile', leftEn: 'Uncomfortable with emotions',
    rightRo: 'Prețuiesc emoțiile', rightEn: 'Value emotions',
    reportKey: 'mbti', traitKey: 'TF',
  },
  {
    id: 'Q42', slug: 'mbti-jp-1', title: 'Lists or memory', kind: 'choice', choiceMode: 'scale',
    promptRo: 'Care te descrie mai bine?', promptEn: 'Which describes you better?',
    leftRo: 'Fac liste', leftEn: 'Make lists',
    rightRo: 'Mă bazez pe memorie', rightEn: 'Rely on memory',
    reportKey: 'mbti', traitKey: 'JP',
  },
  {
    id: 'Q43', slug: 'mbti-jp-2', title: 'Plan ahead', kind: 'choice', choiceMode: 'scale',
    promptRo: 'Care te descrie mai bine?', promptEn: 'Which describes you better?',
    leftRo: 'Planific din timp', leftEn: 'Plan far ahead',
    rightRo: 'Planific în ultimul moment', rightEn: 'Plan at the last minute',
    reportKey: 'mbti', traitKey: 'JP',
  },
  {
    id: 'Q44', slug: 'mbti-jp-3', title: 'Options or commit', kind: 'choice', choiceMode: 'scale',
    promptRo: 'Care te descrie mai bine?', promptEn: 'Which describes you better?',
    leftRo: 'Mă angajez / decid', leftEn: 'Commit',
    rightRo: 'Țin opțiunile deschise', rightEn: 'Keep options open',
    // left = commit (J), right = keep options open (P) → 5 == P, no reverse.
    reportKey: 'mbti', traitKey: 'JP',
  },
  {
    id: 'Q45', slug: 'mbti-jp-4', title: 'Prepare or improvise', kind: 'choice', choiceMode: 'scale',
    promptRo: 'Care te descrie mai bine?', promptEn: 'Which describes you better?',
    leftRo: 'Mă pregătesc', leftEn: 'Prepare',
    rightRo: 'Improvizez', rightEn: 'Improvise',
    // left = prepare (J), right = improvise (P) → 5 == P, no reverse.
    reportKey: 'mbti', traitKey: 'JP',
  },
];
