import { Prisma } from '@prisma/client';
import { DAILY_PROBLEM_BONUS } from '../config/scoring.js';
import { prisma } from '../db.js';
import { addDays, bishkekDay, bishkekDayAsDate } from '../utils/dateRange.js';
import { problemCardSelect, visibleProblemWhere } from './problemQueries.js';
import { toProblemCards, type ProblemCard } from './problems.js';

/** Problems used as daily in this many recent days are not picked again automatically */
const REPEAT_WINDOW_DAYS = 60;

/**
 * Picks a daily problem when the admin didn't choose one: a random visible problem
 * (preferring difficulty 2–3) that wasn't a daily problem recently.
 */
async function autoPick(date: Date): Promise<string | null> {
  const recentSince = new Date(`${addDays(bishkekDay(), -REPEAT_WINDOW_DAYS)}T00:00:00.000Z`);
  const base: Prisma.ProblemWhereInput = {
    AND: [visibleProblemWhere(), { dailyProblems: { none: { date: { gte: recentSince } } } }],
  };

  for (const where of [
    { AND: [base, { difficulty: { in: [2, 3] } }] },
    base,
    visibleProblemWhere(),
  ] satisfies Prisma.ProblemWhereInput[]) {
    const count = await prisma.problem.count({ where });
    if (count === 0) continue;
    const [pick] = await prisma.problem.findMany({
      where,
      orderBy: { id: 'asc' },
      skip: Math.floor(Math.random() * count),
      take: 1,
      select: { id: true },
    });
    if (!pick) continue;
    try {
      await prisma.dailyProblem.create({ data: { date, problemId: pick.id, isAuto: true } });
      return pick.id;
    } catch (error) {
      // Another request picked one at the same time: use theirs
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await prisma.dailyProblem.findUnique({ where: { date } });
        return existing?.problemId ?? null;
      }
      throw error;
    }
  }
  return null;
}

export interface DailyProblem {
  date: string;
  bonus: number;
  problem: ProblemCard;
}

/** Today's (Asia/Bishkek) daily problem, choosing one automatically if needed. */
export async function getDailyProblem(userId?: string): Promise<DailyProblem | null> {
  const date = bishkekDayAsDate();
  const existing = await prisma.dailyProblem.findUnique({ where: { date } });
  const problemId = existing?.problemId ?? (await autoPick(date));
  if (!problemId) return null;

  const row = await prisma.problem.findFirst({
    where: { AND: [visibleProblemWhere(), { id: problemId }] },
    select: problemCardSelect,
  });
  if (!row) return null;
  const [problem] = await toProblemCards([row], userId);
  return problem ? { date: bishkekDay(), bonus: DAILY_PROBLEM_BONUS, problem } : null;
}
