// Calendar days are counted in the Asia/Bishkek time zone (streaks, daily problem, leaderboards).

export const APP_TIME_ZONE = 'Asia/Bishkek';

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** "YYYY-MM-DD" of the given instant in Bishkek */
export function bishkekDay(date: Date = new Date()): string {
  return dayFormatter.format(date);
}

/** Bishkek calendar day as a UTC-midnight Date — the value stored in @db.Date columns */
export function bishkekDayAsDate(date: Date = new Date()): Date {
  return new Date(`${bishkekDay(date)}T00:00:00.000Z`);
}

/** Whole days between two "YYYY-MM-DD" strings (b - a) */
export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Adds days to a "YYYY-MM-DD" string */
export function addDays(day: string, amount: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}

/** Bishkek is UTC+6 all year (no DST since 2005) */
const BISHKEK_OFFSET = '+06:00';

/** Instant of Bishkek midnight for a "YYYY-MM-DD" day */
export function bishkekMidnight(day: string): Date {
  return new Date(`${day}T00:00:00${BISHKEK_OFFSET}`);
}

/** Start of the current Bishkek week (Monday 00:00) */
export function startOfBishkekWeek(now: Date = new Date()): Date {
  const today = bishkekDay(now);
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const sinceMonday = (weekday + 6) % 7;
  return bishkekMidnight(addDays(today, -sinceMonday));
}

/** Start of the current Bishkek month (1st, 00:00) */
export function startOfBishkekMonth(now: Date = new Date()): Date {
  return bishkekMidnight(`${bishkekDay(now).slice(0, 8)}01`);
}
