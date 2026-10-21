// Scoring rules: points = problem.points × difficulty multiplier,
// ×0.5 with a hint, +10% for a first-try solve. Points are awarded once per problem.

export const DIFFICULTY_MULTIPLIER: Readonly<Record<number, number>> = {
  1: 1,
  2: 1.5,
  3: 2,
  4: 2.5,
  5: 3,
};

export const HINT_MULTIPLIER = 0.5;
export const FIRST_TRY_BONUS = 0.1;
/** Extra points for solving the daily problem on its day */
export const DAILY_PROBLEM_BONUS = 10;
/** Solution becomes available after this many wrong attempts */
export const SOLUTION_UNLOCK_ATTEMPTS = 3;

export interface ScoreInput {
  basePoints: number;
  difficulty: number;
  usedHint: boolean;
  firstTry: boolean;
  /** Solution opened before solving — no points */
  solutionOpened: boolean;
}

export function calculatePoints(input: ScoreInput): number {
  if (input.solutionOpened) return 0;
  const multiplier = DIFFICULTY_MULTIPLIER[input.difficulty] ?? 1;
  let points = input.basePoints * multiplier;
  if (input.usedHint) points *= HINT_MULTIPLIER;
  if (input.firstTry) points *= 1 + FIRST_TRY_BONUS;
  return Math.round(points);
}

/** Maximum points a problem can give (shown on cards) */
export function maxPointsFor(basePoints: number, difficulty: number): number {
  return calculatePoints({
    basePoints,
    difficulty,
    usedHint: false,
    firstTry: false,
    solutionOpened: false,
  });
}
