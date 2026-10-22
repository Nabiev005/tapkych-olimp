import type { Prisma, ProblemProgress } from '@prisma/client';
import { maxPointsFor, SOLUTION_UNLOCK_ATTEMPTS } from '../config/scoring.js';
import { prisma } from '../db.js';
import { AppError } from '../utils/errors.js';
import { buildPage, toSkipTake, type Page } from '../utils/pagination.js';
import type { ProblemListQuery } from '../validators/problems.js';
import {
  problemCardSelect,
  problemDetailSelect,
  visibleProblemWhere,
  type ProblemCardRow,
} from './problemQueries.js';

export type UserProblemStatus = 'SOLVED' | 'ATTEMPTED' | null;

export interface ProblemCard extends Omit<ProblemCardRow, 'attemptCount'> {
  attemptCount: number;
  /** Share of users who tried and solved it, 0..100 (null if nobody tried) */
  solvedPercent: number | null;
  maxPoints: number;
  userStatus: UserProblemStatus;
}

function toCard(row: ProblemCardRow, progress?: Pick<ProblemProgress, 'status'>): ProblemCard {
  return {
    ...row,
    solvedPercent:
      row.attemptCount > 0 ? Math.round((row.solvedCount / row.attemptCount) * 100) : null,
    maxPoints: maxPointsFor(row.points, row.difficulty),
    userStatus: progress?.status ?? null,
  };
}

async function progressMap(userId: string | undefined, problemIds: string[]) {
  if (!userId || problemIds.length === 0) return new Map<string, ProblemProgress>();
  const rows = await prisma.problemProgress.findMany({
    where: { userId, problemId: { in: problemIds } },
  });
  return new Map(rows.map((r) => [r.problemId, r]));
}

export async function listProblems(
  query: ProblemListQuery,
  userId?: string,
): Promise<Page<ProblemCard>> {
  const where: Prisma.ProblemWhereInput = { AND: [visibleProblemWhere()] };
  const and = where.AND as Prisma.ProblemWhereInput[];

  if (query.subject) and.push({ subject: { slug: query.subject } });
  if (query.topic) and.push({ topic: { slug: query.topic } });
  if (query.difficulty) and.push({ difficulty: { in: query.difficulty } });
  if (query.level) and.push({ olympiadLevel: query.level });
  if (query.grade) and.push({ gradeFrom: { lte: query.grade }, gradeTo: { gte: query.grade } });
  if (query.q) {
    and.push({
      OR: [
        { titleKy: { contains: query.q, mode: 'insensitive' } },
        { titleRu: { contains: query.q, mode: 'insensitive' } },
      ],
    });
  }
  // Status filters only make sense for a signed-in user (ignored for guests)
  if (query.status && userId) {
    if (query.status === 'solved') and.push({ progress: { some: { userId, status: 'SOLVED' } } });
    if (query.status === 'attempted')
      and.push({ progress: { some: { userId, status: 'ATTEMPTED' } } });
    if (query.status === 'unsolved') and.push({ progress: { none: { userId, status: 'SOLVED' } } });
  }

  const orderBy: Prisma.ProblemOrderByWithRelationInput[] =
    query.sort === 'difficulty'
      ? [{ difficulty: 'asc' }, { solvedCount: 'desc' }]
      : query.sort === 'popular'
        ? [{ solvedCount: 'desc' }, { publishedAt: 'desc' }]
        : [{ publishedAt: 'desc' }, { createdAt: 'desc' }];

  const [rows, total] = await Promise.all([
    prisma.problem.findMany({
      where,
      orderBy: [...orderBy, { id: 'asc' }],
      select: problemCardSelect,
      ...toSkipTake(query.page, query.pageSize),
    }),
    prisma.problem.count({ where }),
  ]);

  const progress = await progressMap(
    userId,
    rows.map((r) => r.id),
  );
  return buildPage(
    rows.map((r) => toCard(r, progress.get(r.id))),
    total,
    query.page,
    query.pageSize,
  );
}

/** Visible problem by slug, or 404 */
export async function findVisibleProblem<S extends Prisma.ProblemSelect>(slug: string, select: S) {
  const problem = await prisma.problem.findFirst({
    where: { AND: [visibleProblemWhere(), { slug }] },
    select,
  });
  if (!problem) throw AppError.notFound();
  return problem;
}

function canOpenSolution(progress: ProblemProgress | null | undefined): boolean {
  if (!progress) return false;
  return progress.status === 'SOLVED' || progress.attempts >= SOLUTION_UNLOCK_ATTEMPTS;
}

export async function getProblem(slug: string, userId?: string) {
  const problem = await findVisibleProblem(slug, problemDetailSelect);
  const { hintKy, hintRu, solutionKy, solutionRu, topicId, ...rest } = problem;

  const [progress, submissions, similarRows] = await Promise.all([
    userId
      ? prisma.problemProgress.findUnique({
          where: { userId_problemId: { userId, problemId: problem.id } },
        })
      : null,
    userId
      ? prisma.submission.findMany({
          where: { userId, problemId: problem.id, contestId: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, answer: true, isCorrect: true, pointsAwarded: true, createdAt: true },
        })
      : [],
    prisma.problem.findMany({
      where: {
        AND: [
          visibleProblemWhere(),
          { topicId, id: { not: problem.id } },
          { difficulty: { gte: problem.difficulty - 1, lte: problem.difficulty + 1 } },
        ],
      },
      orderBy: [{ solvedCount: 'desc' }, { id: 'asc' }],
      take: 4,
      select: problemCardSelect,
    }),
  ]);
  const similarProgress = await progressMap(
    userId,
    similarRows.map((r) => r.id),
  );

  return {
    ...toCard(rest, progress ?? undefined),
    statementKy: rest.statementKy,
    statementRu: rest.statementRu,
    answerType: rest.answerType,
    choices: rest.choices,
    source: rest.source,
    hasHint: Boolean(hintKy),
    // Texts are only included once the user has unlocked them
    hint: progress?.hintOpened && hintKy ? { ky: hintKy, ru: hintRu } : null,
    solution: progress?.solutionOpened ? { ky: solutionKy, ru: solutionRu } : null,
    canOpenSolution: canOpenSolution(progress),
    solutionUnlockAttempts: SOLUTION_UNLOCK_ATTEMPTS,
    progress: progress
      ? {
          status: progress.status,
          attempts: progress.attempts,
          hintOpened: progress.hintOpened,
          solutionOpened: progress.solutionOpened,
          pointsEarned: progress.pointsEarned,
          solvedAt: progress.solvedAt,
        }
      : null,
    submissions,
    similar: similarRows.map((r) => toCard(r, similarProgress.get(r.id))),
  };
}

/** Opens the hint (halves future points unless already solved). */
export async function openHint(slug: string, userId: string) {
  const problem = await findVisibleProblem(slug, { id: true, hintKy: true, hintRu: true });
  if (!problem.hintKy) throw new AppError(404, 'NO_HINT');
  await prisma.problemProgress.upsert({
    where: { userId_problemId: { userId, problemId: problem.id } },
    update: { hintOpened: true },
    create: { userId, problemId: problem.id, hintOpened: true },
  });
  return { hint: { ky: problem.hintKy, ru: problem.hintRu } };
}

/** Opens the solution: allowed after solving or after 3 wrong attempts. */
export async function openSolution(slug: string, userId: string) {
  const problem = await findVisibleProblem(slug, {
    id: true,
    solutionKy: true,
    solutionRu: true,
  });
  const progress = await prisma.problemProgress.findUnique({
    where: { userId_problemId: { userId, problemId: problem.id } },
  });
  if (!canOpenSolution(progress)) throw new AppError(403, 'SOLUTION_LOCKED');
  await prisma.problemProgress.update({
    where: { userId_problemId: { userId, problemId: problem.id } },
    data: { solutionOpened: true },
  });
  return { solution: { ky: problem.solutionKy, ru: problem.solutionRu } };
}

export function listSubjects() {
  return prisma.subject.findMany({
    orderBy: { order: 'asc' },
    select: {
      slug: true,
      nameKy: true,
      nameRu: true,
      icon: true,
      topics: { orderBy: { order: 'asc' }, select: { slug: true, nameKy: true, nameRu: true } },
    },
  });
}

export async function listTopics(subjectSlug: string) {
  const subject = await prisma.subject.findUnique({
    where: { slug: subjectSlug },
    select: {
      topics: { orderBy: { order: 'asc' }, select: { slug: true, nameKy: true, nameRu: true } },
    },
  });
  if (!subject) throw AppError.notFound();
  return subject.topics;
}

/** Card DTOs (with the user's status) for already-selected rows */
export async function toProblemCards(
  rows: ProblemCardRow[],
  userId?: string,
): Promise<ProblemCard[]> {
  const progress = await progressMap(
    userId,
    rows.map((r) => r.id),
  );
  return rows.map((r) => toCard(r, progress.get(r.id)));
}
