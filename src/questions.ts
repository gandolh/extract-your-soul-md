// The questionnaire — see corpus/wiki/sources-raw/02-questionnaire-design.md for
// the rationale behind each question, and
// corpus/wiki/sources-raw/01-research-synthesis.md for the research that led to
// the minimum-set shape.

export interface Question {
  id: string;
  slug: string;
  title: string;
  promptRo: string;
  promptEn: string;
  hintRo?: string;
  hintEn?: string;
  optional?: boolean;
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
  },
  {
    id: 'Q3',
    slug: 'belief-asymmetry',
    title: 'Belief asymmetry',
    promptRo:
      'Care e o convingere pe care o ai, dar pe care majoritatea celor din jur nu o împărtășesc? Nu trebuie să o aperi.',
    promptEn:
      "What's a belief you hold that most people around you don't? You don't have to defend it.",
  },
  {
    id: 'Q4',
    slug: 'narrative-identity',
    title: 'Narrative identity',
    promptRo:
      'Povestește o dată când ceva a mers prost și ce a ieșit până la urmă. Scrie ca și cum i-ai povesti unui prieten apropiat.',
    promptEn:
      "Tell me about a time something went wrong and what came of it. Write it the way you'd tell a close friend.",
  },
  {
    id: 'Q5',
    slug: 'code-switching',
    title: 'Code-switching range',
    promptRo:
      'Cum scrii diferit cu: (a) un prieten apropiat, (b) un coleg de la muncă, (c) un necunoscut căruia trebuie să-i fii politicos?',
    promptEn:
      'How would you describe how you write differently to: (a) a close friend, (b) a colleague at work, (c) a stranger you\'re being polite to?',
  },
  {
    id: 'Q6',
    slug: 'rapport-vs-report',
    title: 'Connect or inform',
    promptRo:
      'Când scrii, încerci mai des să te conectezi cu cineva sau să-l informezi? Sunt contexte în care lucrurile se inversează?',
    promptEn:
      'When you write, are you more often trying to connect with someone or to inform them? Are there contexts where this flips?',
  },
  {
    id: 'Q7',
    slug: 'humor-style',
    title: 'Humor style',
    promptRo: 'Umorul tău — când apare, ce aromă are? Exemple sunt binevenite.',
    promptEn:
      'Your humor — when it shows up, what flavor is it? Examples welcome.',
  },
  {
    id: 'Q8',
    slug: 'self-perception-gap',
    title: 'Self-perception vs. actual',
    promptRo:
      'Cum ai VREA să pari când scrii? Unde se rupe asta de felul în care scrii de fapt?',
    promptEn:
      'How would you LIKE to come across in writing? Where does it diverge from how you actually write?',
  },
  {
    id: 'Q9',
    slug: 'core-want-fear',
    title: 'Core want / core fear',
    promptRo:
      'Completează sincer: Cel mai mult vreau să fiu văzut ca ____, și cel mai mult mă tem să fiu văzut ca ____.',
    promptEn:
      'Finish this honestly: I most want to be seen as ____, and I most fear being seen as ____.',
  },
  {
    id: 'Q10',
    slug: 'aspirational-style-sample',
    title: 'Aspirational style sample',
    promptRo:
      'Scrie 3–4 propoziții într-un stil pe care îl admiri — al oricui, real sau ficțional. Apoi pe scurt: de ce acel stil?',
    promptEn:
      'Write 3–4 sentences in a style you admire — anyone, real or fictional. Then briefly: why that style?',
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
];
