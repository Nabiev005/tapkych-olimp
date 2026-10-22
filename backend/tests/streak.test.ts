import { describe, expect, it } from 'vitest';
import { applySolve, effectiveStreak } from '../src/services/streak.js';
import { bishkekDay } from '../src/utils/dateRange.js';

// Bishkek is UTC+6: 18:00 UTC is already the next day there.
const at = (iso: string) => new Date(iso);

describe('bishkekDay', () => {
  it('uses Asia/Bishkek, not UTC or local time', () => {
    expect(bishkekDay(at('2026-10-21T17:59:00Z'))).toBe('2026-10-21');
    expect(bishkekDay(at('2026-10-21T18:00:00Z'))).toBe('2026-10-22');
    expect(bishkekDay(at('2026-12-31T19:30:00Z'))).toBe('2027-01-01');
  });
});

describe('applySolve', () => {
  const empty = { currentStreak: 0, longestStreak: 0, lastActiveDay: null };

  it('starts a streak with the first solve', () => {
    expect(applySolve(empty, at('2026-10-21T08:00:00Z'))).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDay: '2026-10-21',
    });
  });

  it('does not grow twice on the same Bishkek day', () => {
    const s = { currentStreak: 3, longestStreak: 5, lastActiveDay: '2026-10-21' };
    expect(applySolve(s, at('2026-10-21T17:00:00Z'))).toBe(s);
  });

  it('grows on the next Bishkek day — even if UTC is still the same day', () => {
    const s = { currentStreak: 3, longestStreak: 3, lastActiveDay: '2026-10-21' };
    // 2026-10-21 19:00 UTC = 2026-10-22 01:00 in Bishkek
    expect(applySolve(s, at('2026-10-21T19:00:00Z'))).toEqual({
      currentStreak: 4,
      longestStreak: 4,
      lastActiveDay: '2026-10-22',
    });
  });

  it('resets after a missed day but keeps the longest streak', () => {
    const s = { currentStreak: 6, longestStreak: 9, lastActiveDay: '2026-10-19' };
    expect(applySolve(s, at('2026-10-21T06:00:00Z'))).toEqual({
      currentStreak: 1,
      longestStreak: 9,
      lastActiveDay: '2026-10-21',
    });
  });

  it('continues across month and year boundaries', () => {
    const s = { currentStreak: 2, longestStreak: 2, lastActiveDay: '2026-12-31' };
    expect(applySolve(s, at('2027-01-01T03:00:00Z')).currentStreak).toBe(3);
  });
});

describe('effectiveStreak', () => {
  const now = at('2026-10-22T06:00:00Z'); // 12:00 in Bishkek
  it('keeps the streak through today and yesterday, drops it after that', () => {
    expect(effectiveStreak(5, '2026-10-22', now)).toBe(5);
    expect(effectiveStreak(5, '2026-10-21', now)).toBe(5);
    expect(effectiveStreak(5, '2026-10-20', now)).toBe(0);
    expect(effectiveStreak(5, null, now)).toBe(0);
  });
});
