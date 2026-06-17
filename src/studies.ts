// Studies are a presentation layer over QUESTIONS — they group the canonical
// questions (Q1..Q12, defined in questions.ts) into themed forms. They add NO
// new question content and NO new file-format surface: answers still round-trip
// through the unchanged answers-file.ts contract, keyed by the same question ids.
//
// To add a new psychological study later, this is the ONLY file (plus
// questions.ts) you touch: append the new Question entries (Q13, Q14, ...) to
// QUESTIONS, then add a Study here referencing their ids. The downstream
// parser's `Q\d+` regex already accepts higher ids — nothing else changes.

import { QUESTIONS, type Question } from './questions.js';

// Studies fall in two bands:
//   'voice'   — free-text questions; each answer doubles as a writing sample.
//   'profile' — choice questions grounded in real instruments; they produce a
//               scored report (see src/scoring.ts) shown in the UI and,
//               opt-in, folded into soul.md.
// `reportKey` on a profile study links it to the report it produces, so the UI
// can render that study's result section next to it.
export type StudyBand = 'voice' | 'profile';

export interface Study {
  id: string;
  title: string;
  description: string;
  questionIds: string[];
  band?: StudyBand; // defaults to 'voice'
  reportKey?: string; // set on profile studies
}

export const STUDIES: ReadonlyArray<Study> = [
  // --- Voice band (free-text; the "completion" category) -------------------
  {
    id: 'inner-world',
    title: 'Inner World',
    description: 'Frustrations, passions, and the beliefs you hold quietly.',
    questionIds: ['Q1', 'Q2', 'Q3'],
    band: 'voice',
  },
  {
    id: 'how-you-tell-it',
    title: 'How You Tell It',
    description: 'Narrative, register, and the texture of your humor.',
    questionIds: ['Q4', 'Q12', 'Q5', 'Q6', 'Q7'],
    band: 'voice',
  },
  {
    id: 'how-you-see-yourself',
    title: 'How You See Yourself',
    description: 'Self-perception, core wants and fears, and what you aspire to.',
    questionIds: ['Q8', 'Q9', 'Q10', 'Q11'],
    band: 'voice',
  },

  // --- Profile band (choice; trait reports) --------------------------------
  {
    id: 'big-five',
    title: 'The Big Five',
    description:
      'Quick self-ratings across the five core personality traits — four items each (TIPI + BFI/Mini-IPIP) so the read is steadier than a two-item snapshot. Add a note to any if you want.',
    questionIds: [
      'Q13', 'Q14', 'Q15', 'Q16', 'Q17', 'Q18', 'Q19', 'Q20', 'Q21', 'Q22',
      'Q46', 'Q47', 'Q48', 'Q49', 'Q50',
      'Q57', 'Q58', 'Q59', 'Q60', 'Q61',
    ],
    band: 'profile',
    reportKey: 'big-five',
  },
  {
    id: 'honesty-tone',
    title: 'Stance & Tone',
    description:
      'How you present yourself and the tone you default to — modesty, rapport, formality, humor — two items per axis.',
    questionIds: ['Q23', 'Q24', 'Q25', 'Q26', 'Q27', 'Q28', 'Q51', 'Q52', 'Q53', 'Q54', 'Q55', 'Q56'],
    band: 'profile',
    reportKey: 'honesty-tone',
  },
  {
    id: 'reaction-frame',
    title: 'First Reaction',
    description: 'When something happens, what filters it first — a single pick.',
    questionIds: ['Q29'],
    band: 'profile',
    reportKey: 'pcm',
  },
  {
    id: 'mbti',
    title: 'Type Indicator',
    description:
      'Sixteen word-pairs (open-source, MBTI-style) that estimate a four-letter type. A loose hint — types can flip on retake, so it sits alongside the other signals rather than overruling them.',
    questionIds: [
      'Q30', 'Q31', 'Q32', 'Q33', 'Q34', 'Q35', 'Q36', 'Q37',
      'Q38', 'Q39', 'Q40', 'Q41', 'Q42', 'Q43', 'Q44', 'Q45',
    ],
    band: 'profile',
    reportKey: 'mbti',
  },
  {
    id: 'need-for-cognition',
    title: 'How You Think',
    description:
      'Six quick ratings (NCS-6) on how much you enjoy effortful, analytical thinking — it shapes whether your writing elaborates and abstracts or stays concise and concrete.',
    questionIds: ['Q62', 'Q63', 'Q64', 'Q65', 'Q66', 'Q67'],
    band: 'profile',
    reportKey: 'need-for-cognition',
  },
  {
    id: 'values',
    title: 'What You Value',
    description:
      'Ten short portraits (Schwartz values) — how much each is like you. Surfaces what you care about and the moral vocabulary you reach for.',
    questionIds: [
      'Q68', 'Q69', 'Q70', 'Q71', 'Q72', 'Q73', 'Q74', 'Q75', 'Q76', 'Q77',
    ],
    band: 'profile',
    reportKey: 'values',
  },
  {
    id: 'regulatory-focus',
    title: 'How You Frame Things',
    description:
      'Eight ratings on whether you chase gains and ideals or guard against loss and meet your duties — it colors how you frame what you write.',
    questionIds: ['Q78', 'Q79', 'Q80', 'Q81', 'Q82', 'Q83', 'Q84', 'Q85'],
    band: 'profile',
    reportKey: 'regulatory-focus',
  },
  {
    id: 'locus-of-control',
    title: 'Who Steers',
    description:
      'Four quick ratings on whether outcomes feel driven by your own effort or by others and fate — it shows up as active, agentive narration versus circumstance-driven.',
    questionIds: ['Q86', 'Q87', 'Q88', 'Q89'],
    band: 'profile',
    reportKey: 'locus-of-control',
  },
];

const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

/** The Question objects for a study, in the study's declared order. */
export function studyQuestions(study: Study): Question[] {
  return study.questionIds
    .map((id) => QUESTION_BY_ID.get(id))
    .filter((q): q is Question => q !== undefined);
}

export function findStudy(id: string): Study | undefined {
  return STUDIES.find((s) => s.id === id);
}

/** Which study a given question id belongs to (first match). */
export function questionToStudyId(questionId: string): string | undefined {
  return STUDIES.find((s) => s.questionIds.includes(questionId))?.id;
}
