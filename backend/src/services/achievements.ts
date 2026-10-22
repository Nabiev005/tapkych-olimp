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

/**
 * Metric an achievement is measured by, derived from its code:
 * "first-solve" / "solved-N" → solved problems, "streak-N" → current streak.
 */
function metricFor(code: string): 'solved' | 'streak' | null {
  if (code === 'first-solve' || code.startsWith('solved-')) return 'solved';
  if (code.startsWith('streak-')) return 'streak';
  return null;
}

/** Grants every achievement whose threshold is reached; returns the newly unlocked ones. */
export async function grantAchievements(
  tx: Tx,
  userId: string,
  stats: { solved: number; streak: number },
): Promise<UnlockedAchievement[]> {
  const [all, owned] = await Promise.all([
    tx.achievement.findMany({ orderBy: { order: 'asc' } }),
    tx.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
  ]);
  const ownedIds = new Set(owned.map((o) => o.achievementId));

  const earned = all.filter((a) => {
    if (ownedIds.has(a.id)) return false;
    const metric = metricFor(a.code);
    return metric !== null && stats[metric] >= a.threshold;
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
