import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { TtlCache } from '../utils/cache.js';
import { startOfBishkekMonth, startOfBishkekWeek } from '../utils/dateRange.js';
import { buildPage, toSkipTake, type Page } from '../utils/pagination.js';
import type { LeaderboardQuery, SchoolLeaderboardQuery } from '../validators/rating.js';

// Only active students are ranked. Hidden profiles appear anonymously.

export interface LeaderboardUser {
  id: string;
  /** null when the profile is hidden (shown as an anonymous participant) */
  fullName: string | null;
  isPublic: boolean;
  grade: number | null;
  level: number;
  school: { nameKy: string; nameRu: string } | null;
  region: { nameKy: string; nameRu: string } | null;
}

export interface LeaderboardRow {
  rank: number;
  points: number;
  user: LeaderboardUser;
}

export interface Leaderboard extends Page<LeaderboardRow> {
  period: LeaderboardQuery['period'];
  /** The viewer's own place (even when outside the current page), null if not ranked */
  me: { rank: number; points: number } | null;
}

const userInfoSelect = {
  id: true,
  fullName: true,
  isProfilePublic: true,
  grade: true,
  level: true,
  school: { select: { nameKy: true, nameRu: true } },
  region: { select: { nameKy: true, nameRu: true } },
} satisfies Prisma.UserSelect;

type UserInfoRow = Prisma.UserGetPayload<{ select: typeof userInfoSelect }>;

function toLeaderboardUser(row: UserInfoRow, viewerId?: string): LeaderboardUser {
  const visible = row.isProfilePublic || row.id === viewerId;
  return {
    id: row.id,
    fullName: visible ? row.fullName : null,
    isPublic: row.isProfilePublic,
    grade: row.grade,
    level: row.level,
    school: visible ? row.school : null,
    region: row.region,
  };
}

/** Dense ranks with ties: [50, 40, 40, 10] starting at rank r → [r, r+1, r+1, r+3] */
function rankRows<T extends { points: number }>(rows: T[], firstRank: number, offset: number) {
  let rank = firstRank;
  return rows.map((row, index) => {
    if (index > 0 && row.points < rows[index - 1]!.points) rank = offset + index + 1;
    return { ...row, rank };
  });
}

function userFilter(query: LeaderboardQuery): Prisma.UserWhereInput {
  return {
    role: 'STUDENT',
    isActive: true,
    regionId: query.regionId,
    schoolId: query.schoolId,
    grade: query.grade,
  };
}

// ---------- All time: User.totalPoints (indexed) ----------

async function allTime(query: LeaderboardQuery, viewerId?: string): Promise<Leaderboard> {
  const where: Prisma.UserWhereInput = { ...userFilter(query), totalPoints: { gt: 0 } };
  const { skip, take } = toSkipTake(query.page, query.pageSize);
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ totalPoints: 'desc' }, { id: 'asc' }],
      skip,
      take,
      select: { ...userInfoSelect, totalPoints: true },
    }),
    prisma.user.count({ where }),
  ]);

  const firstRank = rows[0]
    ? (await prisma.user.count({ where: { ...where, totalPoints: { gt: rows[0].totalPoints } } })) +
      1
    : 1;
  const ranked = rankRows(
    rows.map((r) => ({ points: r.totalPoints, row: r })),
    firstRank,
    skip,
  );

  let me: Leaderboard['me'] = null;
  if (viewerId) {
    const viewer = await prisma.user.findFirst({
      where: { ...where, id: viewerId },
      select: { totalPoints: true },
    });
    if (viewer) {
      const above = await prisma.user.count({
        where: { ...where, totalPoints: { gt: viewer.totalPoints } },
      });
      me = { rank: above + 1, points: viewer.totalPoints };
    }
  }

  return {
    ...buildPage(
      ranked.map((r) => ({
        rank: r.rank,
        points: r.points,
        user: toLeaderboardUser(r.row, viewerId),
      })),
      total,
      query.page,
      query.pageSize,
    ),
    period: 'all',
    me,
  };
}

// ---------- Week / month: SUM(Submission.pointsAwarded) since the period start ----------

function periodConditions(query: LeaderboardQuery, since: Date): Prisma.Sql {
  return Prisma.sql`
    s."createdAt" >= ${since}
    AND s."pointsAwarded" > 0
    AND s."contestId" IS NULL
    AND u."role" = 'STUDENT'
    AND u."isActive" = true
    ${query.regionId ? Prisma.sql`AND u."regionId" = ${query.regionId}` : Prisma.empty}
    ${query.schoolId ? Prisma.sql`AND u."schoolId" = ${query.schoolId}` : Prisma.empty}
    ${query.grade ? Prisma.sql`AND u."grade" = ${query.grade}` : Prisma.empty}`;
}

const periodCache = new TtlCache<{ rows: { userId: string; points: number }[]; total: number }>(
  60_000,
);

async function periodPage(query: LeaderboardQuery, since: Date) {
  const key = JSON.stringify({ ...query, since: since.toISOString() });
  return periodCache.get(key, async () => {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const conditions = periodConditions(query, since);
    const [rows, totals] = await Promise.all([
      prisma.$queryRaw<{ userId: string; points: number }[]>`
        SELECT s."userId", SUM(s."pointsAwarded")::int AS points
        FROM "Submission" s JOIN "User" u ON u."id" = s."userId"
        WHERE ${conditions}
        GROUP BY s."userId"
        ORDER BY points DESC, s."userId" ASC
        LIMIT ${take} OFFSET ${skip}`,
      prisma.$queryRaw<{ total: number }[]>`
        SELECT COUNT(DISTINCT s."userId")::int AS total
        FROM "Submission" s JOIN "User" u ON u."id" = s."userId"
        WHERE ${conditions}`,
    ]);
    return { rows, total: totals[0]?.total ?? 0 };
  });
}

/** Number of users with strictly more points than `points` in the period */
async function periodUsersAbove(query: LeaderboardQuery, since: Date, points: number) {
  const result = await prisma.$queryRaw<{ above: number }[]>`
    SELECT COUNT(*)::int AS above FROM (
      SELECT s."userId" FROM "Submission" s JOIN "User" u ON u."id" = s."userId"
      WHERE ${periodConditions(query, since)}
      GROUP BY s."userId"
      HAVING SUM(s."pointsAwarded") > ${points}
    ) ranked`;
  return result[0]?.above ?? 0;
}

async function periodLeaderboard(
  query: LeaderboardQuery,
  viewerId?: string,
  now: Date = new Date(),
): Promise<Leaderboard> {
  const since = query.period === 'week' ? startOfBishkekWeek(now) : startOfBishkekMonth(now);
  const { rows, total } = await periodPage(query, since);
  const { skip } = toSkipTake(query.page, query.pageSize);

  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.userId) } },
    select: userInfoSelect,
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  const firstRank = rows[0] ? (await periodUsersAbove(query, since, rows[0].points)) + 1 : 1;
  const ranked = rankRows(rows, firstRank, skip);

  let me: Leaderboard['me'] = null;
  if (viewerId) {
    const mine = await prisma.$queryRaw<{ points: number }[]>`
      SELECT SUM(s."pointsAwarded")::int AS points
      FROM "Submission" s JOIN "User" u ON u."id" = s."userId"
      WHERE ${periodConditions(query, since)} AND s."userId" = ${viewerId}`;
    const points = mine[0]?.points ?? 0;
    if (points > 0) me = { rank: (await periodUsersAbove(query, since, points)) + 1, points };
  }

  return {
    ...buildPage(
      ranked.flatMap((r) => {
        const user = byId.get(r.userId);
        return user
          ? [{ rank: r.rank, points: r.points, user: toLeaderboardUser(user, viewerId) }]
          : [];
      }),
      total,
      query.page,
      query.pageSize,
    ),
    period: query.period,
    me,
  };
}

export function getLeaderboard(query: LeaderboardQuery, viewerId?: string): Promise<Leaderboard> {
  return query.period === 'all' ? allTime(query, viewerId) : periodLeaderboard(query, viewerId);
}

// ---------- Schools: sum of their students' total points ----------

export interface SchoolRow {
  rank: number;
  points: number;
  students: number;
  school: {
    id: string;
    nameKy: string;
    nameRu: string;
    region: { nameKy: string; nameRu: string };
  };
}

export async function getSchoolLeaderboard(
  query: SchoolLeaderboardQuery,
): Promise<Page<SchoolRow>> {
  const { skip, take } = toSkipTake(query.page, query.pageSize);
  const conditions = Prisma.sql`
    u."role" = 'STUDENT' AND u."isActive" = true AND u."schoolId" IS NOT NULL AND u."totalPoints" > 0
    ${query.regionId ? Prisma.sql`AND u."regionId" = ${query.regionId}` : Prisma.empty}`;

  const [rows, totals] = await Promise.all([
    prisma.$queryRaw<{ schoolId: string; points: number; students: number }[]>`
      SELECT u."schoolId", SUM(u."totalPoints")::int AS points, COUNT(*)::int AS students
      FROM "User" u WHERE ${conditions}
      GROUP BY u."schoolId"
      ORDER BY points DESC, u."schoolId" ASC
      LIMIT ${take} OFFSET ${skip}`,
    prisma.$queryRaw<{ total: number }[]>`
      SELECT COUNT(DISTINCT u."schoolId")::int AS total FROM "User" u WHERE ${conditions}`,
  ]);

  const schools = await prisma.school.findMany({
    where: { id: { in: rows.map((r) => r.schoolId) } },
    select: {
      id: true,
      nameKy: true,
      nameRu: true,
      region: { select: { nameKy: true, nameRu: true } },
    },
  });
  const byId = new Map(schools.map((s) => [s.id, s]));

  let firstRank = 1;
  if (rows[0]) {
    const above = await prisma.$queryRaw<{ above: number }[]>`
      SELECT COUNT(*)::int AS above FROM (
        SELECT u."schoolId" FROM "User" u WHERE ${conditions}
        GROUP BY u."schoolId" HAVING SUM(u."totalPoints") > ${rows[0].points}
      ) ranked`;
    firstRank = (above[0]?.above ?? 0) + 1;
  }

  return buildPage(
    rankRows(rows, firstRank, skip).flatMap((r) => {
      const school = byId.get(r.schoolId);
      return school ? [{ rank: r.rank, points: r.points, students: r.students, school }] : [];
    }),
    totals[0]?.total ?? 0,
    query.page,
    query.pageSize,
  );
}

/** All-time rank of a student (null for non-students or zero points) */
export async function allTimeRank(userId: string): Promise<number | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, totalPoints: true, isActive: true },
  });
  if (!user || user.role !== 'STUDENT' || !user.isActive || user.totalPoints <= 0) return null;
  const above = await prisma.user.count({
    where: { role: 'STUDENT', isActive: true, totalPoints: { gt: user.totalPoints } },
  });
  return above + 1;
}

/** Test hook: period results are cached for a minute */
export function clearRatingCache(): void {
  periodCache.clear();
}
