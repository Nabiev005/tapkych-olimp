import type { ProblemPayload } from '../services/classes';
import type { AnswerType, OlympiadLevel } from '../services/problems';

// Form state for creating/editing a problem (teacher proposal, admin editor).

export interface ChoiceValue {
  id: string;
  textKy: string;
  textRu: string;
}

export interface ProblemFormValues {
  subjectSlug: string;
  topicSlug: string;
  titleKy: string;
  titleRu: string;
  statementKy: string;
  statementRu: string;
  answerType: AnswerType;
  /** INTEGER/DECIMAL/MULTIPLE_CHOICE: one value; TEXT: one accepted answer per line */
  correctAnswer: string;
  tolerance: string;
  choices: ChoiceValue[];
  solutionKy: string;
  solutionRu: string;
  hintKy: string;
  hintRu: string;
  difficulty: number;
  olympiadLevel: OlympiadLevel;
  gradeFrom: number;
  gradeTo: number;
  points: number;
  source: string;
}

export const EMPTY_PROBLEM: ProblemFormValues = {
  subjectSlug: '',
  topicSlug: '',
  titleKy: '',
  titleRu: '',
  statementKy: '',
  statementRu: '',
  answerType: 'INTEGER',
  correctAnswer: '',
  tolerance: '0.01',
  choices: [
    { id: 'a', textKy: '', textRu: '' },
    { id: 'b', textKy: '', textRu: '' },
  ],
  solutionKy: '',
  solutionRu: '',
  hintKy: '',
  hintRu: '',
  difficulty: 2,
  olympiadLevel: 'SCHOOL',
  gradeFrom: 7,
  gradeTo: 9,
  points: 10,
  source: '',
};

const orNull = (value: string) => (value.trim() ? value.trim() : null);

export function toProblemPayload(v: ProblemFormValues): ProblemPayload {
  const textAnswers = v.correctAnswer
    .split('\n')
    .map((a) => a.trim())
    .filter(Boolean);
  return {
    subjectSlug: v.subjectSlug,
    topicSlug: v.topicSlug,
    titleKy: v.titleKy.trim(),
    titleRu: orNull(v.titleRu),
    statementKy: v.statementKy.trim(),
    statementRu: orNull(v.statementRu),
    answerType: v.answerType,
    correctAnswer: v.answerType === 'TEXT' ? textAnswers : v.correctAnswer.trim(),
    tolerance: v.answerType === 'DECIMAL' ? Number(v.tolerance.replace(',', '.')) || null : null,
    choices:
      v.answerType === 'MULTIPLE_CHOICE'
        ? v.choices.map((c) => ({ id: c.id, textKy: c.textKy.trim(), textRu: orNull(c.textRu) }))
        : null,
    solutionKy: v.solutionKy.trim(),
    solutionRu: orNull(v.solutionRu),
    hintKy: orNull(v.hintKy),
    hintRu: orNull(v.hintRu),
    difficulty: v.difficulty,
    olympiadLevel: v.olympiadLevel,
    gradeFrom: v.gradeFrom,
    gradeTo: v.gradeTo,
    points: v.points,
    source: orNull(v.source),
  };
}

/** Back from API data (admin editor) */
export function fromProblemPayload(p: ProblemPayload): ProblemFormValues {
  return {
    ...p,
    titleRu: p.titleRu ?? '',
    statementRu: p.statementRu ?? '',
    correctAnswer: Array.isArray(p.correctAnswer) ? p.correctAnswer.join('\n') : p.correctAnswer,
    tolerance: p.tolerance ? String(p.tolerance) : '0.01',
    choices: (p.choices ?? EMPTY_PROBLEM.choices).map((c) => ({ ...c, textRu: c.textRu ?? '' })),
    solutionRu: p.solutionRu ?? '',
    hintKy: p.hintKy ?? '',
    hintRu: p.hintRu ?? '',
    source: p.source ?? '',
  };
}
