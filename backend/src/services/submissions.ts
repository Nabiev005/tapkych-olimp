import { getLevelForPoints } from '../config/levels.js';
import {
  calculatePoints,
  DAILY_PROBLEM_BONUS,
  SOLUTION_UNLOCK_ATTEMPTS,
} from '../config/scoring.js';
import { prisma } from '../db.js';
import { bishkekDayAsDate } from '../utils/dateRange.js';
import { grantAchievements, type UnlockedAchievement } from './achievements.js';
import { checkAnswer } from './answerChecker.js';
import { findVisibleProblem } from './problems.js';
import { applySolve, dateColumnToDay, dayToDateColumn } from './streak.js';

export interface SubmitResult {
  isCorrect: boolean;
  pointsAwarded: number;
  /** Was already solved before this submission (no points) */
  alreadySolved: boolean;
  dailyBonus: number;
  attempts: number;
  canOpenSolution: boolean;
  totalPoints: number;
  level: number;
  leveledUp: boolean;
  currentStreak: number;
  achievements: UnlockedAchievement[];
}

/**
 * Checks an answer and records it. Points are awarded once per problem;
 * the conditional ATTEMPTED → SOLVED update makes double-awarding impossible
 * even for concurrent submissions.
 */
export async function submitAnswer(
  slug: string,
  userId: string,
  answer: string,
): Promise<SubmitResult> {
  const problem = await findVisibleProblem(slug, {
    id: true,
    answerType: true,
    correctAnswer: true,
    tolerance: true,
    difficulty: true,
    points: true,
  });
  const isCorrect = checkAnswer(problem, answer);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.problemProgress.findUnique({
      where: { userId_problemId: { userId, problemId: problem.id } },
    });
    const progress =
      existing ?? (await tx.problemProgress.create({ data: { userId, problemId: problem.id } }));
    if (!existing) {
      // attemptCount = number of users who tried the problem
      await tx.problem.update({
        where: { id: problem.id },
        data: { attemptCount: { increment: 1 } },
      });
    }

    const alreadySolved = progress.status === 'SOLVED';
    const firstTry = progress.attempts === 0;
    const attempts = alreadySolved ? progress.attempts : progress.attempts + 1;

    let pointsAwarded = 0;
    let dailyBonus = 0;
    let newlySolved = false;

    if (isCorrect && !alreadySolved) {
      const { count } = await tx.problemProgress.updateMany({
        where: { id: progress.id, status: 'ATTEMPTED' },
        data: { status: 'SOLVED', solvedAt: now, attempts },
      });
      newlySolved = count === 1;
    } else if (!alreadySolved) {
      await tx.problemProgress.update({ where: { id: progress.id }, data: { attempts } });
    }

    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        totalPoints: true,
        level: true,
        currentStreak: true,
        longestStreak: true,
        lastActiveDate: true,
      },
    });
    let { totalPoints, level, currentStreak } = user;
    let achievements: UnlockedAchievement[] = [];

    if (newlySolved) {
      pointsAwarded = calculatePoints({
        basePoints: problem.points,
        difficulty: problem.difficulty,
        usedHint: progress.hintOpened,
        firstTry,
        solutionOpened: progress.solutionOpened,
      });
      // Daily problem bonus (only when the solve itself earns points)
      if (pointsAwarded > 0) {
        const daily = await tx.dailyProblem.findUnique({ where: { date: bishkekDayAsDate(now) } });
        if (daily?.problemId === problem.id) dailyBonus = DAILY_PROBLEM_BONUS;
      }
      pointsAwarded += dailyBonus;

      const streak = applySolve(
        {
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
          lastActiveDay: dateColumnToDay(user.lastActiveDate),
        },
        now,
      );
      totalPoints = user.totalPoints + pointsAwarded;
      level = getLevelForPoints(totalPoints).level;
      currentStreak = streak.currentStreak;

      await Promise.all([
        tx.problemProgress.update({
          where: { id: progress.id },
          data: { pointsEarned: pointsAwarded },
        }),
        tx.problem.update({ where: { id: problem.id }, data: { solvedCount: { increment: 1 } } }),
        tx.user.update({
          where: { id: userId },
          data: {
            totalPoints,
            level,
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
            lastActiveDate: streak.lastActiveDay ? dayToDateColumn(streak.lastActiveDay) : null,
          },
        }),
      ]);

      achievements = await grantAchievements(tx, userId, { streak: currentStreak });
    }

    await tx.submission.create({
      data: {
        userId,
        problemId: problem.id,
        answer,
        isCorrect,
        pointsAwarded,
        usedHint: progress.hintOpened,
      },
    });

    return {
      isCorrect,
      pointsAwarded,
      alreadySolved,
      dailyBonus,
      attempts,
      canOpenSolution: isCorrect || alreadySolved || attempts >= SOLUTION_UNLOCK_ATTEMPTS,
      totalPoints,
      level,
      leveledUp: level > user.level,
      currentStreak,
      achievements,
    };
  });
}
