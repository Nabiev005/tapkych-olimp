import type { Prisma } from '@prisma/client';
import { hasPermission, type Role } from '../config/permissions.js';
import { prisma } from '../db.js';
import { AppError } from '../utils/errors.js';
import type { CreateContestInput } from '../validators/contests.js';
import { grantAchievements } from './achievements.js';
import { checkAnswer } from './answerChecker.js';
import {
  contestPhase,
  personalDeadline,
  rankParticipants,
  scoreParticipant,
  type ContestPhase,
} from './contestScoring.js';
import { visibleProblemWhere } from './problemQueries.js';

// All timing decisions use the server clock only.

interface Viewer {
  id: string;
  role: Role;
}

const contestBaseSelect = {
  id: true,
  titleKy: true,
  titleRu: true,
  descriptionKy: true,
  descriptionRu: true,
  startsAt: true,
  endsAt: true,
  durationMinutes: true,
  showVerdicts: true,
  isPublic: true,
  status: true,
  classId: true,
  createdById: true,
  subject: { select: { slug: true, nameKy: true, nameRu: true } },
  class: { select: { id: true, name: true, teacherId: true } },
  _count: { select: { participants: true, problems: true } },
} satisfies Prisma.ContestSelect;

type ContestRow = Prisma.ContestGetPayload<{ select: typeof contestBaseSelect }>;

/** Contests visible to the viewer: public ones, plus class contests of their classes */
async function visibleContestWhere(viewer?: Viewer): Promise<Prisma.ContestWhereInput> {
  const publicOnly: Prisma.ContestWhereInput = { isPublic: true, classId: null };
  if (!viewer) return { status: 'PUBLISHED', ...publicOnly };
  if (viewer.role === 'ADMIN') return { status: 'PUBLISHED' };
  return {
    status: 'PUBLISHED',
    OR: [
      publicOnly,
      { class: { teacherId: viewer.id } },
      { class: { members: { some: { userId: viewer.id } } } },
    ],
  };
}

function canManage(contest: ContestRow, viewer?: Viewer): boolean {
  if (!viewer) return false;
  return (
    viewer.role === 'ADMIN' ||
    contest.createdById === viewer.id ||
    contest.class?.teacherId === viewer.id
  );
}

async function findVisibleContest(id: string, viewer?: Viewer): Promise<ContestRow> {
  const contest = await prisma.contest.findFirst({
    where: { AND: [{ id }, await visibleContestWhere(viewer)] },
    select: contestBaseSelect,
  });
  if (!contest) throw AppError.notFound();
  return contest;
}

function summary(contest: ContestRow, now: Date) {
  return {
    id: contest.id,
    titleKy: contest.titleKy,
    titleRu: contest.titleRu,
    startsAt: contest.startsAt,
    endsAt: contest.endsAt,
    durationMinutes: contest.durationMinutes,
    showVerdicts: contest.showVerdicts,
    subject: contest.subject,
    class: contest.class ? { id: contest.class.id, name: contest.class.name } : null,
    phase: contestPhase(contest, now),
    participantCount: contest._count.participants,
    problemCount: contest._count.problems,
  };
}

export async function listContests(viewer?: Viewer) {
  const now = new Date();
  const contests = await prisma.contest.findMany({
    where: await visibleContestWhere(viewer),
    orderBy: { startsAt: 'desc' },
    take: 100,
    select: {
      ...contestBaseSelect,
      participants: viewer
        ? { where: { userId: viewer.id }, select: { startedAt: true, finishedAt: true } }
        : false,
    },
  });
  return contests.map((c) => ({
    ...summary(c, now),
    registered: Boolean(c.participants?.length),
  }));
}

interface ParticipantState {
  registered: boolean;
  startedAt: Date | null;
  finishedAt: Date | null;
  deadline: Date | null;
  /** May submit answers right now */
  active: boolean;
}

function participantState(
  contest: { endsAt: Date; durationMinutes: number },
  participant: { startedAt: Date | null; finishedAt: Date | null } | null,
  now: Date,
): ParticipantState {
  if (!participant) {
    return { registered: false, startedAt: null, finishedAt: null, deadline: null, active: false };
  }
  const deadline = participant.startedAt
    ? personalDeadline(participant.startedAt, contest.durationMinutes, contest.endsAt)
    : null;
  return {
    registered: true,
    startedAt: participant.startedAt,
    finishedAt: participant.finishedAt,
    deadline,
    active: Boolean(deadline && !participant.finishedAt && now < deadline),
  };
}

export async function getContest(id: string, viewer?: Viewer) {
  const now = new Date();
  const contest = await findVisibleContest(id, viewer);
  const phase = contestPhase(contest, now);
  const participant = viewer
    ? await prisma.contestParticipant.findUnique({
        where: { contestId_userId: { contestId: id, userId: viewer.id } },
      })
    : null;
  const me = participantState(contest, participant, now);
  const manage = canManage(contest, viewer);

  // Problems: to started participants during the contest, to everyone afterwards
  const showProblems = phase === 'finished' || Boolean(me.startedAt) || manage;
  const revealVerdicts = contest.showVerdicts || phase === 'finished';

  let problems: unknown[] = [];
  if (showProblems) {
    const rows = await prisma.contestProblem.findMany({
      where: { contestId: id },
      orderBy: { order: 'asc' },
      select: {
        points: true,
        order: true,
        problem: {
          select: {
            id: true,
            slug: true,
            titleKy: true,
            titleRu: true,
            statementKy: true,
            statementRu: true,
            answerType: true,
            choices: true,
            difficulty: true,
          },
        },
      },
    });
    const submissions = viewer
      ? await prisma.submission.findMany({
          where: { contestId: id, userId: viewer.id },
          orderBy: { createdAt: 'asc' },
          select: { problemId: true, answer: true, isCorrect: true, createdAt: true },
        })
      : [];
    const scored = participant?.startedAt
      ? scoreParticipant(
          rows.map((r) => ({ problemId: r.problem.id, points: r.points })),
          submissions,
          participant.startedAt,
          contest.showVerdicts,
        )
      : null;

    problems = rows.map((r) => {
      const own = submissions.filter((s) => s.problemId === r.problem.id);
      const result = scored?.problems.find((p) => p.problemId === r.problem.id);
      return {
        id: r.problem.id,
        // The catalog link only makes sense once the contest is over
        slug: phase === 'finished' ? r.problem.slug : null,
        titleKy: r.problem.titleKy,
        titleRu: r.problem.titleRu,
        statementKy: r.problem.statementKy,
        statementRu: r.problem.statementRu,
        answerType: r.problem.answerType,
        choices: r.problem.choices,
        difficulty: r.problem.difficulty,
        points: r.points,
        order: r.order,
        myAnswer: own.at(-1)?.answer ?? null,
        attempts: own.length,
        solved: revealVerdicts && result ? result.solved : null,
      };
    });
  }

  return {
    ...summary(contest, now),
    descriptionKy: contest.descriptionKy,
    descriptionRu: contest.descriptionRu,
    serverTime: now,
    canManage: manage,
    me: {
      ...me,
      score: revealVerdicts && participant?.startedAt ? participant.score : null,
      penalty: revealVerdicts && participant?.startedAt ? participant.penalty : null,
    },
    problems,
  };
}

export async function register(id: string, viewer: Viewer) {
  const contest = await findVisibleContest(id, viewer);
  if (contestPhase(contest) === 'finished') throw new AppError(400, 'CONTEST_FINISHED');
  await prisma.contestParticipant.upsert({
    where: { contestId_userId: { contestId: id, userId: viewer.id } },
    update: {},
    create: { contestId: id, userId: viewer.id },
  });
  return { registered: true };
}

/** Starts the participant's personal timer (registering on the fly if needed). */
export async function start(id: string, viewer: Viewer) {
  const now = new Date();
  const contest = await findVisibleContest(id, viewer);
  const phase = contestPhase(contest, now);
  if (phase === 'upcoming') throw new AppError(400, 'CONTEST_NOT_STARTED');
  if (phase === 'finished') throw new AppError(400, 'CONTEST_FINISHED');

  const existing = await prisma.contestParticipant.findUnique({
    where: { contestId_userId: { contestId: id, userId: viewer.id } },
  });
  if (existing?.startedAt) {
    return participantState(contest, existing, now);
  }
  const participant = await prisma.contestParticipant.upsert({
    where: { contestId_userId: { contestId: id, userId: viewer.id } },
    update: { startedAt: now },
    create: { contestId: id, userId: viewer.id, startedAt: now },
  });
  await grantAchievements(prisma, viewer.id);
  return participantState(contest, participant, now);
}

export async function submit(id: string, viewer: Viewer, problemId: string, answer: string) {
  const now = new Date();
  const contest = await findVisibleContest(id, viewer);
  const participant = await prisma.contestParticipant.findUnique({
    where: { contestId_userId: { contestId: id, userId: viewer.id } },
  });
  const state = participantState(contest, participant, now);
  if (!participant?.startedAt) throw new AppError(400, 'CONTEST_NOT_JOINED');
  if (!state.active) throw new AppError(400, 'CONTEST_TIME_OVER');

  const contestProblems = await prisma.contestProblem.findMany({
    where: { contestId: id },
    select: {
      points: true,
      problem: { select: { id: true, answerType: true, correctAnswer: true, tolerance: true } },
    },
  });
  const target = contestProblems.find((cp) => cp.problem.id === problemId);
  if (!target) throw AppError.notFound();

  const isCorrect = checkAnswer(target.problem, answer);
  await prisma.submission.create({
    data: { userId: viewer.id, problemId, contestId: id, answer, isCorrect, pointsAwarded: 0 },
  });

  // Recompute the participant's score from all their submissions
  const submissions = await prisma.submission.findMany({
    where: { contestId: id, userId: viewer.id },
    select: { problemId: true, isCorrect: true, createdAt: true },
  });
  const scored = scoreParticipant(
    contestProblems.map((cp) => ({ problemId: cp.problem.id, points: cp.points })),
    submissions,
    participant.startedAt,
    contest.showVerdicts,
  );
  await prisma.contestParticipant.update({
    where: { contestId_userId: { contestId: id, userId: viewer.id } },
    data: { score: scored.score, penalty: scored.penalty },
  });

  return {
    saved: true,
    // Verdicts stay hidden until the end unless the contest shows them
    isCorrect: contest.showVerdicts ? isCorrect : null,
    score: contest.showVerdicts ? scored.score : null,
  };
}

/** Finish early: no more submissions */
export async function finish(id: string, viewer: Viewer) {
  await findVisibleContest(id, viewer);
  const { count } = await prisma.contestParticipant.updateMany({
    where: { contestId: id, userId: viewer.id, startedAt: { not: null }, finishedAt: null },
    data: { finishedAt: new Date() },
  });
  if (count === 0) throw new AppError(400, 'CONTEST_NOT_JOINED');
  return { finished: true };
}

export async function results(id: string, viewer?: Viewer) {
  const now = new Date();
  const contest = await findVisibleContest(id, viewer);
  const phase: ContestPhase = contestPhase(contest, now);
  if (phase !== 'finished' && !canManage(contest, viewer)) {
    throw new AppError(403, 'RESULTS_NOT_READY');
  }

  const [problems, participants] = await Promise.all([
    prisma.contestProblem.findMany({
      where: { contestId: id },
      orderBy: { order: 'asc' },
      select: { points: true, problem: { select: { id: true, titleKy: true, titleRu: true } } },
    }),
    prisma.contestParticipant.findMany({
      where: { contestId: id, startedAt: { not: null } },
      select: {
        startedAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            isProfilePublic: true,
            school: { select: { nameKy: true, nameRu: true } },
          },
        },
      },
    }),
  ]);
  const submissions = await prisma.submission.findMany({
    where: { contestId: id },
    select: { userId: true, problemId: true, isCorrect: true, createdAt: true },
  });

  const problemPoints = problems.map((p) => ({ problemId: p.problem.id, points: p.points }));
  const rows = participants.map((p) => {
    const scored = scoreParticipant(
      problemPoints,
      submissions.filter((s) => s.userId === p.user.id),
      p.startedAt!,
      contest.showVerdicts,
    );
    const visible = p.user.isProfilePublic || p.user.id === viewer?.id;
    return {
      user: {
        id: p.user.id,
        fullName: visible ? p.user.fullName : null,
        isPublic: p.user.isProfilePublic,
        school: visible ? p.user.school : null,
      },
      score: scored.score,
      penalty: scored.penalty,
      problems: scored.problems.map((r) => ({ solved: r.solved, attempts: r.attempts })),
    };
  });

  return {
    contest: summary(contest, now),
    problems: problems.map((p) => ({
      id: p.problem.id,
      titleKy: p.problem.titleKy,
      titleRu: p.problem.titleRu,
      points: p.points,
    })),
    rows: rankParticipants(rows),
  };
}

/** Admins create public contests; teachers create contests for their own classes. */
export async function createContest(viewer: Viewer, input: CreateContestInput) {
  const isClassContest = Boolean(input.classId);
  if (isClassContest) {
    if (!hasPermission(viewer.role, 'contests:createClass')) throw AppError.forbidden();
    const klass = await prisma.class.findUnique({ where: { id: input.classId! } });
    if (!klass || (klass.teacherId !== viewer.id && viewer.role !== 'ADMIN')) {
      throw AppError.notFound();
    }
  } else if (!hasPermission(viewer.role, 'contests:createPublic')) {
    throw AppError.forbidden();
  }

  const slugs = input.problems.map((p) => p.slug);
  // Public contests may use published problems (they are hidden until the end);
  // class contests use problems from the visible catalog.
  const problems = await prisma.problem.findMany({
    where: isClassContest
      ? { AND: [visibleProblemWhere(), { slug: { in: slugs } }] }
      : { status: 'PUBLISHED', slug: { in: slugs } },
    select: { id: true, slug: true, subjectId: true },
  });
  if (problems.length !== slugs.length) throw new AppError(400, 'PROBLEMS_UNAVAILABLE');
  const bySlug = new Map(problems.map((p) => [p.slug, p]));
  const subjectIds = new Set(problems.map((p) => p.subjectId));

  return prisma.contest.create({
    data: {
      titleKy: input.titleKy,
      titleRu: input.titleRu,
      descriptionKy: input.descriptionKy,
      descriptionRu: input.descriptionRu,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      durationMinutes: input.durationMinutes,
      showVerdicts: input.showVerdicts,
      isPublic: !isClassContest,
      classId: input.classId ?? null,
      subjectId: subjectIds.size === 1 ? [...subjectIds][0]! : null,
      status: 'PUBLISHED',
      createdById: viewer.id,
      problems: {
        create: input.problems.map((p, order) => ({
          problemId: bySlug.get(p.slug)!.id,
          points: p.points,
          order,
        })),
      },
    },
    select: { id: true },
  });
}
