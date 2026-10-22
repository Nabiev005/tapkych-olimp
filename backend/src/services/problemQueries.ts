import type { Prisma } from '@prisma/client';

// Shared problem selects. correctAnswer is deliberately absent from every select here:
// these are the only shapes of a problem that reach API responses.

export const subjectRefSelect = {
  slug: true,
  nameKy: true,
  nameRu: true,
} satisfies Prisma.SubjectSelect;
export const topicRefSelect = {
  slug: true,
  nameKy: true,
  nameRu: true,
} satisfies Prisma.TopicSelect;

export const problemCardSelect = {
  id: true,
  slug: true,
  titleKy: true,
  titleRu: true,
  difficulty: true,
  olympiadLevel: true,
  gradeFrom: true,
  gradeTo: true,
  points: true,
  solvedCount: true,
  attemptCount: true,
  publishedAt: true,
  subject: { select: subjectRefSelect },
  topic: { select: topicRefSelect },
} satisfies Prisma.ProblemSelect;

export const problemDetailSelect = {
  ...problemCardSelect,
  statementKy: true,
  statementRu: true,
  answerType: true,
  choices: true,
  source: true,
  topicId: true,
  // Only presence is exposed; texts are returned when unlocked
  hintKy: true,
  hintRu: true,
  solutionKy: true,
  solutionRu: true,
} satisfies Prisma.ProblemSelect;

/** Published problems that are not part of a contest that hasn't ended yet. */
export function visibleProblemWhere(now: Date = new Date()): Prisma.ProblemWhereInput {
  return {
    status: 'PUBLISHED',
    contestProblems: { none: { contest: { endsAt: { gt: now } } } },
  };
}

export type ProblemCardRow = Prisma.ProblemGetPayload<{ select: typeof problemCardSelect }>;
