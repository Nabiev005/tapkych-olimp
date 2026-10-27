import { Prisma } from '@prisma/client';
import type { Role } from '../config/permissions.js';
import { prisma } from '../db.js';
import { addDays, bishkekDay } from '../utils/dateRange.js';
import { AppError } from '../utils/errors.js';
import { buildPage, toSkipTake } from '../utils/pagination.js';
import { problemCardSelect } from './problemQueries.js';
import { dayToDateColumn } from './streak.js';

// ---------- Users ----------

export async function listUsers(query: {
  q?: string;
  role?: Role;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.UserWhereInput = {
    role: query.role,
    ...(query.q
      ? {
          OR: [
            { fullName: { contains: query.q, mode: 'insensitive' } },
            { email: { contains: query.q.toLowerCase() } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        grade: true,
        isActive: true,
        totalPoints: true,
        createdAt: true,
        school: { select: { nameKy: true, nameRu: true } },
        region: { select: { nameKy: true, nameRu: true } },
      },
      ...toSkipTake(query.page, query.pageSize),
    }),
    prisma.user.count({ where }),
  ]);
  return buildPage(items, total, query.page, query.pageSize);
}

/** Change role / block. Admins cannot demote or block themselves. */
export async function updateUser(
  adminId: string,
  userId: string,
  input: { role?: Role; isActive?: boolean },
) {
  if (userId === adminId && ((input.role && input.role !== 'ADMIN') || input.isActive === false)) {
    throw new AppError(400, 'CANNOT_CHANGE_SELF');
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw AppError.notFound();

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      role: input.role,
      isActive: input.isActive,
      // Students keep their grade; other roles don't have one
      ...(input.role && input.role !== 'STUDENT' ? { grade: null } : {}),
    },
    select: { id: true, role: true, isActive: true },
  });
  // Blocked users or changed roles: end sessions so the new state applies at once
  if (input.isActive === false || input.role) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  return updated;
}

// ---------- Subjects, topics, schools ----------

function conflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new AppError(409, 'SLUG_TAKEN');
  }
  throw error;
}

export async function createSubject(input: Prisma.SubjectCreateInput) {
  return prisma.subject.create({ data: input }).catch(conflict);
}

export async function updateSubject(id: string, input: Prisma.SubjectUpdateInput) {
  return prisma.subject.update({ where: { id }, data: input }).catch(conflict);
}

export async function createTopic(input: {
  subjectSlug: string;
  slug: string;
  nameKy: string;
  nameRu: string;
  order: number;
}) {
  const subject = await prisma.subject.findUnique({ where: { slug: input.subjectSlug } });
  if (!subject) throw new AppError(400, 'UNKNOWN_TOPIC');
  const { subjectSlug: _s, ...data } = input;
  return prisma.topic.create({ data: { ...data, subjectId: subject.id } }).catch(conflict);
}

export async function updateTopic(
  id: string,
  input: { slug: string; nameKy: string; nameRu: string; order: number },
) {
  return prisma.topic.update({ where: { id }, data: input }).catch(conflict);
}

export async function listTaxonomy() {
  return prisma.subject.findMany({
    orderBy: { order: 'asc' },
    select: {
      id: true,
      slug: true,
      nameKy: true,
      nameRu: true,
      icon: true,
      order: true,
      topics: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          slug: true,
          nameKy: true,
          nameRu: true,
          order: true,
          _count: { select: { problems: true } },
        },
      },
    },
  });
}

export async function createSchool(input: {
  regionId: string;
  nameKy: string;
  nameRu: string;
  district: string | null;
}) {
  const region = await prisma.region.findUnique({ where: { id: input.regionId } });
  if (!region) throw AppError.notFound();
  return prisma.school.create({ data: input });
}

export async function updateSchool(
  id: string,
  input: { regionId: string; nameKy: string; nameRu: string; district: string | null },
) {
  return prisma.school.update({ where: { id }, data: input });
}

// ---------- Daily problem schedule ----------

export async function listDaily(days = 14) {
  const from = addDays(bishkekDay(), -3);
  const rows = await prisma.dailyProblem.findMany({
    where: { date: { gte: dayToDateColumn(from), lte: dayToDateColumn(addDays(from, days + 3)) } },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      isAuto: true,
      problem: { select: { slug: true, titleKy: true, titleRu: true, difficulty: true } },
    },
  });
  return {
    today: bishkekDay(),
    items: rows.map((r) => ({ ...r, date: r.date.toISOString().slice(0, 10) })),
  };
}

/** The admin's choice replaces an automatic pick for that day. */
export async function setDaily(date: string, problemSlug: string) {
  const problem = await prisma.problem.findFirst({
    where: { slug: problemSlug, status: 'PUBLISHED' },
    select: { id: true },
  });
  if (!problem) throw new AppError(400, 'PROBLEMS_UNAVAILABLE');
  const day = dayToDateColumn(date);
  return prisma.dailyProblem.upsert({
    where: { date: day },
    update: { problemId: problem.id, isAuto: false },
    create: { date: day, problemId: problem.id, isAuto: false },
    select: { date: true, isAuto: true },
  });
}

// ---------- Statistics ----------

export async function getStats() {
  const since = addDays(bishkekDay(), -13);
  const sinceInstant = new Date(`${since}T00:00:00+06:00`);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  const [roles, newUsers, problems, pendingProposals, activity, topSolved, hardest, contests] =
    await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.problem.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.problem.count({ where: { status: 'DRAFT', author: { role: 'TEACHER' } } }),
      prisma.$queryRaw<{ day: string; submissions: number; activeUsers: number; solved: number }[]>`
        SELECT to_char(s."createdAt" + interval '6 hours', 'YYYY-MM-DD') AS day,
          COUNT(*)::int AS submissions,
          COUNT(DISTINCT s."userId")::int AS "activeUsers",
          COUNT(*) FILTER (WHERE s."isCorrect")::int AS solved
        FROM "Submission" s
        WHERE s."createdAt" >= ${sinceInstant}
        GROUP BY day ORDER BY day`,
      prisma.problem.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { solvedCount: 'desc' },
        take: 5,
        select: problemCardSelect,
      }),
      // Hardest: lowest solve rate among problems tried by at least 3 users
      prisma.$queryRaw<
        {
          id: string;
          slug: string;
          titleKy: string;
          titleRu: string | null;
          solvedCount: number;
          attemptCount: number;
        }[]
      >`
        SELECT "id", "slug", "titleKy", "titleRu", "solvedCount", "attemptCount"
        FROM "Problem"
        WHERE "status" = 'PUBLISHED' AND "attemptCount" >= 3
        ORDER BY ("solvedCount"::float / "attemptCount") ASC, "attemptCount" DESC
        LIMIT 5`,
      prisma.contest.count({ where: { status: 'PUBLISHED' } }),
    ]);

  // Fill missing days with zeros so the chart has a continuous axis
  const byDay = new Map(activity.map((a) => [a.day, a]));
  const days = Array.from({ length: 14 }, (_, i) => {
    const day = addDays(since, i);
    return byDay.get(day) ?? { day, submissions: 0, activeUsers: 0, solved: 0 };
  });

  return {
    users: {
      total: roles.reduce((sum, r) => sum + r._count._all, 0),
      byRole: Object.fromEntries(roles.map((r) => [r.role, r._count._all])),
      newThisWeek: newUsers,
    },
    problems: Object.fromEntries(problems.map((p) => [p.status, p._count._all])),
    pendingProposals,
    contests,
    activity: days,
    topSolved,
    hardest: hardest.map((h) => ({
      ...h,
      solvedPercent: Math.round((h.solvedCount / h.attemptCount) * 100),
    })),
  };
}
