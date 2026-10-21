// Student levels by total points. Names are bilingual.

export interface LevelDefinition {
  level: number;
  minPoints: number;
  nameKy: string;
  nameRu: string;
}

export const LEVELS: readonly LevelDefinition[] = [
  { level: 1, minPoints: 0, nameKy: 'Башталгыч', nameRu: 'Начинающий' },
  { level: 2, minPoints: 100, nameKy: 'Мектеп чемпиону', nameRu: 'Чемпион школы' },
  { level: 3, minPoints: 300, nameKy: 'Райондук деңгээл', nameRu: 'Районный уровень' },
  { level: 4, minPoints: 700, nameKy: 'Облустук деңгээл', nameRu: 'Областной уровень' },
  { level: 5, minPoints: 1500, nameKy: 'Республикалык деңгээл', nameRu: 'Республиканский уровень' },
  { level: 6, minPoints: 3000, nameKy: 'Эл аралык деңгээл', nameRu: 'Международный уровень' },
  { level: 7, minPoints: 6000, nameKy: 'Тапкыч', nameRu: 'Тапкыч' },
];

export function getLevelForPoints(points: number): LevelDefinition {
  let current = LEVELS[0]!;
  for (const level of LEVELS) {
    if (points >= level.minPoints) current = level;
  }
  return current;
}

export interface LevelProgress {
  current: LevelDefinition;
  next: LevelDefinition | null;
  /** 0..1 — progress towards the next level (1 at max level) */
  progress: number;
  pointsToNext: number;
}

export function getLevelProgress(points: number): LevelProgress {
  const current = getLevelForPoints(points);
  const next = LEVELS.find((level) => level.level === current.level + 1) ?? null;
  if (!next) return { current, next: null, progress: 1, pointsToNext: 0 };
  const span = next.minPoints - current.minPoints;
  return {
    current,
    next,
    progress: Math.min(1, Math.max(0, (points - current.minPoints) / span)),
    pointsToNext: next.minPoints - points,
  };
}
