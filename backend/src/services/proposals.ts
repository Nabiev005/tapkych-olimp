import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { AppError } from '../utils/errors.js';
import { uniqueSlug } from '../utils/slug.js';
import type { ProblemInput } from '../validators/problemInput.js';

/** Maps validated problem input to Prisma data (shared with the admin editor). */
export async function problemDataFromInput(input: ProblemInput) {
  const topic = await prisma.topic.findFirst({
    where: { slug: input.topicSlug, subject: { slug: input.subjectSlug } },
    select: { id: true, subjectId: true },
  });
  if (!topic) throw new AppError(400, 'UNKNOWN_TOPIC');

  return {
    subjectId: topic.subjectId,
    topicId: topic.id,
    titleKy: input.titleKy,
    titleRu: input.titleRu,
    statementKy: input.statementKy,
    statementRu: input.statementRu,
    answerType: input.answerType,
    correctAnswer: input.correctAnswer,
    tolerance: input.answerType === 'DECIMAL' ? (input.tolerance ?? null) : null,
    choices:
      input.answerType === 'MULTIPLE_CHOICE' && input.choices
        ? input.choices.map((c) => ({ id: c.id, textKy: c.textKy, textRu: c.textRu }))
        : Prisma.DbNull,
    solutionKy: input.solutionKy,
    solutionRu: input.solutionRu,
    hintKy: input.hintKy,
    hintRu: input.hintRu,
    difficulty: input.difficulty,
    olympiadLevel: input.olympiadLevel,
    gradeFrom: input.gradeFrom,
    gradeTo: input.gradeTo,
    points: input.points,
    source: input.source,
  } satisfies Omit<Prisma.ProblemUncheckedCreateInput, 'slug'>;
}

/** A teacher proposal: stored as DRAFT, published only after admin review. */
export async function createProposal(authorId: string, input: ProblemInput) {
  const data = await problemDataFromInput(input);
  return prisma.problem.create({
    data: { ...data, slug: uniqueSlug(input.titleKy), status: 'DRAFT', authorId },
    select: { id: true, slug: true, titleKy: true, status: true, createdAt: true },
  });
}

export function listMyProposals(authorId: string) {
  return prisma.problem.findMany({
    where: { authorId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      slug: true,
      titleKy: true,
      titleRu: true,
      status: true,
      reviewNote: true,
      createdAt: true,
      subject: { select: { slug: true, nameKy: true, nameRu: true } },
    },
  });
}
