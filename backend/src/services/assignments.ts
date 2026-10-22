import type { Role } from '../config/permissions.js';
import { prisma } from '../db.js';
import { AppError } from '../utils/errors.js';
import type { CreateAssignmentInput } from '../validators/classes.js';
import { findOwnClass } from './classes.js';
import { problemCardSelect, visibleProblemWhere } from './problemQueries.js';
import { toProblemCards } from './problems.js';

interface Viewer {
  id: string;
  role: Role;
}

export async function createAssignment(
  classId: string,
  viewer: Viewer,
  input: CreateAssignmentInput,
) {
  await findOwnClass(classId, viewer);
  const slugs = [...new Set(input.problemSlugs)];
  const problems = await prisma.problem.findMany({
    where: { AND: [visibleProblemWhere(), { slug: { in: slugs } }] },
    select: { id: true, slug: true },
  });
  if (problems.length !== slugs.length) throw new AppError(400, 'PROBLEMS_UNAVAILABLE');
  const idBySlug = new Map(problems.map((p) => [p.slug, p.id]));

  return prisma.assignment.create({
    data: {
      classId,
      titleKy: input.titleKy,
      titleRu: input.titleRu,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      problems: {
        create: slugs.map((slug, order) => ({ problemId: idBySlug.get(slug)!, order })),
      },
    },
    select: { id: true, titleKy: true, titleRu: true, dueDate: true, createdAt: true },
  });
}

/**
 * Assignment results. Teacher: students × problems matrix (SOLVED / ATTEMPTED / null).
 * Student member: the problems with their own status.
 */
export async function getAssignment(classId: string, assignmentId: string, viewer: Viewer) {
  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, classId },
    select: {
      id: true,
      titleKy: true,
      titleRu: true,
      dueDate: true,
      createdAt: true,
      class: { select: { id: true, name: true, teacherId: true } },
      problems: {
        orderBy: { order: 'asc' },
        select: { problem: { select: problemCardSelect } },
      },
    },
  });
  if (!assignment) throw AppError.notFound();

  const isTeacher = assignment.class.teacherId === viewer.id || viewer.role === 'ADMIN';
  if (!isTeacher) {
    const member = await prisma.classMember.findUnique({
      where: { classId_userId: { classId, userId: viewer.id } },
    });
    if (!member) throw AppError.notFound();
  }

  const rows = assignment.problems.map((p) => p.problem);
  const problems = await toProblemCards(rows, isTeacher ? undefined : viewer.id);
  const base = {
    id: assignment.id,
    titleKy: assignment.titleKy,
    titleRu: assignment.titleRu,
    dueDate: assignment.dueDate,
    createdAt: assignment.createdAt,
    class: { id: assignment.class.id, name: assignment.class.name },
    isTeacher,
    problems,
  };
  if (!isTeacher) return { ...base, students: [] };

  const members = await prisma.classMember.findMany({
    where: { classId },
    orderBy: { user: { fullName: 'asc' } },
    select: { user: { select: { id: true, fullName: true } } },
  });
  const progress = await prisma.problemProgress.findMany({
    where: {
      userId: { in: members.map((m) => m.user.id) },
      problemId: { in: rows.map((r) => r.id) },
    },
    select: { userId: true, problemId: true, status: true },
  });
  const status = new Map(progress.map((p) => [`${p.userId}:${p.problemId}`, p.status]));

  return {
    ...base,
    students: members.map(({ user }) => {
      const results = rows.map((r) => status.get(`${user.id}:${r.id}`) ?? null);
      return {
        id: user.id,
        fullName: user.fullName,
        results,
        solved: results.filter((r) => r === 'SOLVED').length,
      };
    }),
  };
}

/** Open assignments of the user's classes, for the dashboard */
export async function myAssignments(userId: string) {
  const now = new Date();
  const assignments = await prisma.assignment.findMany({
    where: {
      class: { members: { some: { userId } } },
      OR: [{ dueDate: null }, { dueDate: { gte: new Date(now.getTime() - 7 * 86_400_000) } }],
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    take: 10,
    select: {
      id: true,
      titleKy: true,
      titleRu: true,
      dueDate: true,
      class: { select: { id: true, name: true } },
      problems: { select: { problemId: true } },
    },
  });
  const problemIds = assignments.flatMap((a) => a.problems.map((p) => p.problemId));
  const solved = new Set(
    (
      await prisma.problemProgress.findMany({
        where: { userId, status: 'SOLVED', problemId: { in: problemIds } },
        select: { problemId: true },
      })
    ).map((p) => p.problemId),
  );
  return assignments
    .map(({ problems, ...a }) => ({
      ...a,
      problemCount: problems.length,
      solvedCount: problems.filter((p) => solved.has(p.problemId)).length,
    }))
    .filter((a) => a.solvedCount < a.problemCount);
}
