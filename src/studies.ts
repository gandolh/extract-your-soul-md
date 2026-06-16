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

export interface Study {
  id: string;
  title: string;
  description: string;
  questionIds: string[];
}

export const STUDIES: ReadonlyArray<Study> = [
  {
    id: 'inner-world',
    title: 'Inner World',
    description: 'Frustrations, passions, and the beliefs you hold quietly.',
    questionIds: ['Q1', 'Q2', 'Q3'],
  },
  {
    id: 'how-you-tell-it',
    title: 'How You Tell It',
    description: 'Narrative, register, and the texture of your humor.',
    questionIds: ['Q4', 'Q12', 'Q5', 'Q6', 'Q7'],
  },
  {
    id: 'how-you-see-yourself',
    title: 'How You See Yourself',
    description: 'Self-perception, core wants and fears, and what you aspire to.',
    questionIds: ['Q8', 'Q9', 'Q10', 'Q11'],
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
