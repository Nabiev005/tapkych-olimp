import { getLevelProgress } from '../config/levels.js';
import { prisma } from '../db.js';
import { addDays, bishkekDay } from '../utils/dateRange.js';
import { AppError } from '../utils/errors.js';
import { allTimeRank } from './rating.js';
import { dateColumnToDay, effectiveStreak } from './streak.js';

/** Days shown in the activity calendar (~6 months) */
export const ACTIVITY_DAYS = 182;

/**
 * Public profile (7.8). Never includes email or other contact data (8.8).
 * Hidden profiles are visible only to their owner.
 */
export async function getPublicProfile(userId: string, viewerId?: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      role: true,
      grade: true,
      avatarUrl: true,
      totalPoints: true,
      level: true,
      currentStreak: true,
      longestStreak: true,
      lastActiveDate: true,
      isProfilePublic: true,
      isActive: true,
      createdAt: true,
      customSchoolName: true,
      school: { select: { nameKy: true, nameRu: true } },
      region: { select: { nameKy: true, nameRu: true } },
    },
  });
  if (!user || !user.isActive) throw AppError.notFound();
  const isOwner = user.id === viewerId;
  if (!user.isProfilePublic && !isOwner) throw new AppError(403, 'PROFILE_PRIVATE');

  // Bishkek is UTC+6; solvedAt is stored in UTC
  const firstDay = addDays(bishkekDay(), -(ACTIVITY_DAYS - 1));
  const since = new Date(`${firstDay}T00:00:00+06:00`);

  const [subjects, bySubject, byDifficulty, activity, achievements, rank] = await Promise.all([
    prisma.subject.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, slug: true, nameKy: true, nameRu: true },
    }),
    prisma.$queryRaw<{ subjectId: string; count: number }[]>`
      SELECT p."subjectId", COUNT(*)::int AS count
      FROM "ProblemProgress" pp JOIN "Problem" p ON p."id" = pp."problemId"
      WHERE pp."userId" = ${userId} AND pp."status" = 'SOLVED'
      GROUP BY p."subjectId"`,
    prisma.$queryRaw<{ difficulty: number; count: number }[]>`
      SELECT p."difficulty", COUNT(*)::int AS count
      FROM "ProblemProgress" pp JOIN "Problem" p ON p."id" = pp."problemId"
      WHERE pp."userId" = ${userId} AND pp."status" = 'SOLVED'
      GROUP BY p."difficulty"`,
    prisma.$queryRaw<{ day: string; count: number }[]>`
      SELECT to_char(pp."solvedAt" + interval '6 hours', 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
      FROM "ProblemProgress" pp
      WHERE pp."userId" = ${userId} AND pp."status" = 'SOLVED' AND pp."solvedAt" >= ${since}
      GROUP BY day ORDER BY day`,
    prisma.achievement.findMany({
      orderBy: { order: 'asc' },
      select: {
        code: true,
        nameKy: true,
        nameRu: true,
        descriptionKy: true,
        descriptionRu: true,
        icon: true,
        users: { where: { userId }, select: { unlockedAt: true } },
      },
    }),
    allTimeRank(userId),
  ]);

  const subjectCounts = new Map(bySubject.map((r) => [r.subjectId, r.count]));
  const difficultyCounts = new Map(byDifficulty.map((r) => [r.difficulty, r.count]));
  const progress = getLevelProgress(user.totalPoints);

  return {
    id: user.id,
    fullName: user.fullName,
    role: user.role,
    grade: user.grade,
    avatarUrl: user.avatarUrl,
    school:
      user.school ??
      (user.customSchoolName
        ? { nameKy: user.customSchoolName, nameRu: user.customSchoolName }
        : null),
    region: user.region,
    isProfilePublic: user.isProfilePublic,
    isOwner,
    memberSince: user.createdAt,
    totalPoints: user.totalPoints,
    level: user.level,
    levelProgress: {
      progress: progress.progress,
      pointsToNext: progress.pointsToNext,
      nextLevel: progress.next?.level ?? null,
    },
    currentStreak: effectiveStreak(user.currentStreak, dateColumnToDay(user.lastActiveDate)),
    longestStreak: user.longestStreak,
    rank,
    totalSolved: bySubject.reduce((sum, r) => sum + r.count, 0),
    solvedBySubject: subjects.map((s) => ({
      slug: s.slug,
      nameKy: s.nameKy,
      nameRu: s.nameRu,
      count: subjectCounts.get(s.id) ?? 0,
    })),
    solvedByDifficulty: [1, 2, 3, 4, 5].map((d) => ({
      difficulty: d,
      count: difficultyCounts.get(d) ?? 0,
    })),
    activity: { from: firstDay, to: bishkekDay(), days: activity },
    achievements: achievements.map(({ users, ...a }) => ({
      ...a,
      unlockedAt: users[0]?.unlockedAt ?? null,
    })),
  };
}
