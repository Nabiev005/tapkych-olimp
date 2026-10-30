import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export interface UnlockedAchievement {
  code: string;
  nameKy: string;
  nameRu: string;
  descriptionKy: string;
  descriptionRu: string;
  icon: string;
}

/** Problems of this difficulty and above count as "hard" */
export const HARD_DIFFICULTY = 4;

type Metric =
  | { kind: 'solved' }
  | { kind: 'streak' }
  | { kind: 'hard' }
  | { kind: 'contests' }
  | { kind: 'subject'; subject: string };

/**
 * Metric an achievement is measured by, derived from its code:
 * "first-solve" / "solved-N" → solved problems, "streak-N" → current streak,
 * "hard-N" → solved problems of difficulty ≥ 4, "contest-N" → contests started,
 * "<subject>-N" (e.g. "math-10") → solved problems of that subject.
 */
export function metricFor(code: string): Metric | null {
  if (code === 'first-solve' || code.startsWith('solved-')) return { kind: 'solved' };
  const match = /^([a-z]+)-\d+$/.exec(code);
  if (!match) return null;
  const prefix = match[1]!;
  if (prefix === 'streak') return { kind: 'streak' };
  if (prefix === 'hard') return { kind: 'hard' };
  if (prefix === 'contest') return { kind: 'contests' };
  return { kind: 'subject', subject: prefix };
}

interface Stats {
  solved: number;
  hard: number;
  contests: number;
  bySubject: Map<string, number>;
  /** Unknown outside of a catalog solve: streak achievements are skipped then */
  streak: number | null;
}

async function loadStats(tx: Tx, userId: string, streak: number | null): Promise<Stats> {
  const [solvedRows, contests] = await Promise.all([
    tx.problemProgress.findMany({
      where: { userId, status: 'SOLVED' },
      select: { problem: { select: { difficulty: true, subject: { select: { slug: true } } } } },
    }),
    tx.contestParticipant.count({ where: { userId, startedAt: { not: null } } }),
  ]);
  const bySubject = new Map<string, number>();
  let hard = 0;
  for (const { problem } of solvedRows) {
    bySubject.set(problem.subject.slug, (bySubject.get(problem.subject.slug) ?? 0) + 1);
    if (problem.difficulty >= HARD_DIFFICULTY) hard += 1;
  }
  return { solved: solvedRows.length, hard, contests, bySubject, streak };
}

function valueOf(metric: Metric, stats: Stats): number | null {
  switch (metric.kind) {
    case 'solved':
      return stats.solved;
    case 'streak':
      return stats.streak;
    case 'hard':
      return stats.hard;
    case 'contests':
      return stats.contests;
    case 'subject':
      return stats.bySubject.get(metric.subject) ?? 0;
  }
}

/** Grants every achievement whose threshold is reached; returns the newly unlocked ones. */
export async function grantAchievements(
  tx: Tx,
  userId: string,
  options: { streak?: number } = {},
): Promise<UnlockedAchievement[]> {
  const [all, owned] = await Promise.all([
    tx.achievement.findMany({ orderBy: { order: 'asc' } }),
    tx.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
  ]);
  const ownedIds = new Set(owned.map((o) => o.achievementId));
  const pending = all.filter((a) => !ownedIds.has(a.id));
  if (pending.length === 0) return [];

  const stats = await loadStats(tx, userId, options.streak ?? null);
  const earned = pending.filter((a) => {
    const metric = metricFor(a.code);
    const value = metric ? valueOf(metric, stats) : null;
    return value !== null && value >= a.threshold;
  });
  if (earned.length === 0) return [];

  await tx.userAchievement.createMany({
    data: earned.map((a) => ({ userId, achievementId: a.id })),
    skipDuplicates: true,
  });
  return earned.map(({ code, nameKy, nameRu, descriptionKy, descriptionRu, icon }) => ({
    code,
    nameKy,
    nameRu,
    descriptionKy,
    descriptionRu,
    icon,
  }));
}
