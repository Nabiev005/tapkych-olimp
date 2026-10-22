import { addDays, bishkekDay } from '../utils/dateRange.js';

// A streak grows when the user solves at least one problem per Bishkek calendar day.

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  /** "YYYY-MM-DD" (Asia/Bishkek) of the last day with a solve */
  lastActiveDay: string | null;
}

/** New streak state after a correct solve at `now`. */
export function applySolve(state: StreakState, now: Date = new Date()): StreakState {
  const today = bishkekDay(now);
  if (state.lastActiveDay === today) return state;

  const continues = state.lastActiveDay === addDays(today, -1);
  const currentStreak = continues ? state.currentStreak + 1 : 1;
  return {
    currentStreak,
    longestStreak: Math.max(state.longestStreak, currentStreak),
    lastActiveDay: today,
  };
}

/** Streak to display: it is broken once a whole day passes without a solve. */
export function effectiveStreak(
  currentStreak: number,
  lastActiveDay: string | null,
  now: Date = new Date(),
): number {
  if (!lastActiveDay) return 0;
  const today = bishkekDay(now);
  return lastActiveDay === today || lastActiveDay === addDays(today, -1) ? currentStreak : 0;
}

/** @db.Date column value → "YYYY-MM-DD" */
export function dateColumnToDay(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/** "YYYY-MM-DD" → @db.Date column value */
export function dayToDateColumn(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}
