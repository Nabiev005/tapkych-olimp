import { randomInt } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { Role } from '../config/permissions.js';
import { prisma } from '../db.js';
import { AppError } from '../utils/errors.js';

// Join codes avoid look-alike characters (0/O, 1/I/L)
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateJoinCode(): string {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
}

interface Viewer {
  id: string;
  role: Role;
}

/** Class the viewer teaches (or any class for admins), else 404 */
export async function findOwnClass(classId: string, viewer: Viewer) {
  const klass = await prisma.class.findUnique({ where: { id: classId } });
  if (!klass || (klass.teacherId !== viewer.id && viewer.role !== 'ADMIN'))
    throw AppError.notFound();
  return klass;
}

export async function createClass(
  teacherId: string,
  input: { name: string; grade?: number | null },
) {
  const teacher = await prisma.user.findUniqueOrThrow({
    where: { id: teacherId },
    select: { schoolId: true },
  });
  // Retry on the (unlikely) join-code collision
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.class.create({
        data: {
          name: input.name,
          grade: input.grade ?? null,
          teacherId,
          schoolId: teacher.schoolId,
          joinCode: generateJoinCode(),
        },
        select: { id: true, name: true, grade: true, joinCode: true, createdAt: true },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'))
        throw error;
    }
  }
  throw new AppError(500, 'INTERNAL');
}

/** Teachers: classes they teach. Everyone: classes they joined. */
export async function listClasses(userId: string) {
  const [teaching, joined] = await Promise.all([
    prisma.class.findMany({
      where: { teacherId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        grade: true,
        joinCode: true,
        createdAt: true,
        _count: { select: { members: true, assignments: true } },
      },
    }),
    prisma.classMember.findMany({
      where: { userId },
      orderBy: { joinedAt: 'desc' },
      select: {
        joinedAt: true,
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
            teacher: { select: { fullName: true } },
            _count: { select: { assignments: true } },
          },
        },
      },
    }),
  ]);
  return {
    teaching: teaching.map(({ _count, ...c }) => ({
      ...c,
      memberCount: _count.members,
      assignmentCount: _count.assignments,
    })),
    joined: joined.map(({ joinedAt, class: c }) => ({
      id: c.id,
      name: c.name,
      grade: c.grade,
      teacherName: c.teacher.fullName,
      assignmentCount: c._count.assignments,
      joinedAt,
    })),
  };
}

export async function joinClass(userId: string, code: string) {
  const klass = await prisma.class.findUnique({
    where: { joinCode: code },
    select: { id: true, name: true, teacherId: true },
  });
  if (!klass) throw new AppError(404, 'INVALID_JOIN_CODE');
  if (klass.teacherId === userId) throw new AppError(400, 'OWN_CLASS');
  await prisma.classMember.upsert({
    where: { classId_userId: { classId: klass.id, userId } },
    update: {},
    create: { classId: klass.id, userId },
  });
  return { id: klass.id, name: klass.name };
}

/** Teacher removes a student, or a student leaves the class */
export async function removeMember(classId: string, memberId: string, viewer: Viewer) {
  if (memberId !== viewer.id) await findOwnClass(classId, viewer);
  await prisma.classMember.deleteMany({ where: { classId, userId: memberId } });
}

type AssignmentRow = {
  id: string;
  titleKy: string;
  titleRu: string | null;
  dueDate: Date | null;
  createdAt: Date;
  problems: { problemId: string }[];
};

/** Per-assignment progress for a set of users: solved / attempted counts */
async function assignmentProgress(assignments: AssignmentRow[], userIds: string[]) {
  const problemIds = [...new Set(assignments.flatMap((a) => a.problems.map((p) => p.problemId)))];
  if (problemIds.length === 0 || userIds.length === 0) return [];
  return prisma.problemProgress.findMany({
    where: { userId: { in: userIds }, problemId: { in: problemIds } },
    select: { userId: true, problemId: true, status: true },
  });
}

/**
 * Class page. The teacher (or an admin) sees members with stats and assignment
 * completion; a member sees the class and their own assignment progress.
 */
export async function getClass(classId: string, viewer: Viewer) {
  const klass = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      name: true,
      grade: true,
      joinCode: true,
      teacherId: true,
      createdAt: true,
      teacher: { select: { fullName: true } },
      assignments: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          titleKy: true,
          titleRu: true,
          dueDate: true,
          createdAt: true,
          problems: { select: { problemId: true } },
        },
      },
    },
  });
  if (!klass) throw AppError.notFound();

  const isTeacher = klass.teacherId === viewer.id || viewer.role === 'ADMIN';
  if (!isTeacher) {
    const member = await prisma.classMember.findUnique({
      where: { classId_userId: { classId, userId: viewer.id } },
    });
    if (!member) throw AppError.notFound();
  }

  const members = isTeacher
    ? await prisma.classMember.findMany({
        where: { classId },
        orderBy: { user: { totalPoints: 'desc' } },
        select: {
          joinedAt: true,
          user: {
            select: {
              id: true,
              fullName: true,
              grade: true,
              totalPoints: true,
              level: true,
              _count: { select: { progress: { where: { status: 'SOLVED' } } } },
            },
          },
        },
      })
    : [];

  const userIds = isTeacher ? members.map((m) => m.user.id) : [viewer.id];
  const progress = await assignmentProgress(klass.assignments, userIds);
  const solvedSet = new Set(
    progress.filter((p) => p.status === 'SOLVED').map((p) => `${p.userId}:${p.problemId}`),
  );

  const assignments = klass.assignments.map(({ problems, ...a }) => {
    const ids = problems.map((p) => p.problemId);
    const solvedByUser = userIds.map(
      (u) => ids.filter((pid) => solvedSet.has(`${u}:${pid}`)).length,
    );
    return {
      ...a,
      problemCount: ids.length,
      // teacher: students who finished everything; student: own solved count
      completedCount: isTeacher
        ? solvedByUser.filter((n) => n === ids.length && n > 0).length
        : undefined,
      mySolved: isTeacher ? undefined : (solvedByUser[0] ?? 0),
    };
  });

  return {
    id: klass.id,
    name: klass.name,
    grade: klass.grade,
    teacherName: klass.teacher.fullName,
    createdAt: klass.createdAt,
    isTeacher,
    joinCode: isTeacher ? klass.joinCode : undefined,
    members: members.map((m) => ({
      id: m.user.id,
      fullName: m.user.fullName,
      grade: m.user.grade,
      totalPoints: m.user.totalPoints,
      level: m.user.level,
      solvedCount: m.user._count.progress,
      joinedAt: m.joinedAt,
    })),
    assignments,
  };
}

/** Class statistics: which assignment problems were hardest for the class */
export async function getClassStats(classId: string, viewer: Viewer) {
  await findOwnClass(classId, viewer);
  const rows = await prisma.$queryRaw<
    {
      problemId: string;
      slug: string;
      titleKy: string;
      titleRu: string | null;
      difficulty: number;
      solved: number;
      attempted: number;
    }[]
  >`
    SELECT p."id" AS "problemId", p."slug", p."titleKy", p."titleRu", p."difficulty",
      COUNT(pp."userId") FILTER (WHERE pp."status" = 'SOLVED')::int AS solved,
      COUNT(pp."userId")::int AS attempted
    FROM (SELECT DISTINCT ap."problemId" FROM "AssignmentProblem" ap
          JOIN "Assignment" a ON a."id" = ap."assignmentId" WHERE a."classId" = ${classId}) cp
    JOIN "Problem" p ON p."id" = cp."problemId"
    LEFT JOIN "ProblemProgress" pp ON pp."problemId" = p."id"
      AND pp."userId" IN (SELECT "userId" FROM "ClassMember" WHERE "classId" = ${classId})
    GROUP BY p."id"`;
  const memberCount = await prisma.classMember.count({ where: { classId } });
  return {
    memberCount,
    problems: rows
      .map((r) => ({
        ...r,
        solvedPercent: memberCount ? Math.round((r.solved / memberCount) * 100) : 0,
      }))
      // hardest first
      .sort((a, b) => a.solvedPercent - b.solvedPercent || b.difficulty - a.difficulty),
  };
}
