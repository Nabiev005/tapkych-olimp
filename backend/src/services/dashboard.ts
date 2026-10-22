import { prisma } from '../db.js';
import { myAssignments } from './assignments.js';
import { getDailyProblem } from './daily.js';
import { problemCardSelect, visibleProblemWhere } from './problemQueries.js';
import { toProblemCards } from './problems.js';

/** Data for the signed-in home page (7.12). */
export async function getDashboard(userId: string) {
  const now = new Date();
  const [daily, recent, upcomingContests, assignments] = await Promise.all([
    getDailyProblem(userId),
    // "Continue": problems the user tried but hasn't solved yet
    prisma.problem.findMany({
      where: {
        AND: [visibleProblemWhere(now), { progress: { some: { userId, status: 'ATTEMPTED' } } }],
      },
      select: {
        ...problemCardSelect,
        progress: { where: { userId }, select: { updatedAt: true } },
      },
      take: 20,
    }),
    prisma.contest.findMany({
      where: { status: 'PUBLISHED', isPublic: true, classId: null, endsAt: { gt: now } },
      orderBy: { startsAt: 'asc' },
      take: 3,
      select: {
        id: true,
        titleKy: true,
        titleRu: true,
        startsAt: true,
        endsAt: true,
        durationMinutes: true,
      },
    }),
    myAssignments(userId),
  ]);

  const continueRows = recent
    .sort(
      (a, b) =>
        (b.progress[0]?.updatedAt.getTime() ?? 0) - (a.progress[0]?.updatedAt.getTime() ?? 0),
    )
    .slice(0, 4)
    .map(({ progress: _progress, ...row }) => row);

  return {
    daily,
    continue: await toProblemCards(continueRows, userId),
    upcomingContests,
    assignments,
  };
}
