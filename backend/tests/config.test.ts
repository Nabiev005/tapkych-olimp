import { describe, expect, it } from 'vitest';
import { getLevelForPoints, getLevelProgress, LEVELS } from '../src/config/levels.js';
import { hasPermission } from '../src/config/permissions.js';
import { calculatePoints, maxPointsFor } from '../src/config/scoring.js';

describe('levels', () => {
  it('has 7 levels in ascending order', () => {
    expect(LEVELS).toHaveLength(7);
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i]!.minPoints).toBeGreaterThan(LEVELS[i - 1]!.minPoints);
    }
  });

  it('maps points to levels at the boundaries', () => {
    expect(getLevelForPoints(0).level).toBe(1);
    expect(getLevelForPoints(99).level).toBe(1);
    expect(getLevelForPoints(100).level).toBe(2);
    expect(getLevelForPoints(2999).level).toBe(5);
    expect(getLevelForPoints(6000).level).toBe(7);
    expect(getLevelForPoints(100000).nameKy).toBe('Тапкыч');
  });

  it('computes progress to the next level', () => {
    const p = getLevelProgress(200);
    expect(p.current.level).toBe(2);
    expect(p.next?.level).toBe(3);
    expect(p.progress).toBeCloseTo(0.5);
    expect(p.pointsToNext).toBe(100);
    expect(getLevelProgress(7000)).toMatchObject({ next: null, progress: 1, pointsToNext: 0 });
  });
});

describe('scoring', () => {
  const base = {
    basePoints: 10,
    difficulty: 3,
    usedHint: false,
    firstTry: false,
    solutionOpened: false,
  };

  it('multiplies by difficulty', () => {
    expect(calculatePoints(base)).toBe(20);
    expect(maxPointsFor(10, 1)).toBe(10);
    expect(maxPointsFor(10, 5)).toBe(30);
  });

  it('halves points when a hint was used', () => {
    expect(calculatePoints({ ...base, usedHint: true })).toBe(10);
  });

  it('adds 10% for a first-try solve', () => {
    expect(calculatePoints({ ...base, firstTry: true })).toBe(22);
    expect(calculatePoints({ ...base, firstTry: true, usedHint: true })).toBe(11);
  });

  it('gives nothing if the solution was opened first', () => {
    expect(calculatePoints({ ...base, solutionOpened: true, firstTry: true })).toBe(0);
  });
});

describe('permissions', () => {
  it('teachers inherit student permissions, admins have everything', () => {
    expect(hasPermission('STUDENT', 'problems:submit')).toBe(true);
    expect(hasPermission('STUDENT', 'classes:create')).toBe(false);
    expect(hasPermission('TEACHER', 'problems:submit')).toBe(true);
    expect(hasPermission('TEACHER', 'classes:create')).toBe(true);
    expect(hasPermission('TEACHER', 'problems:publish')).toBe(false);
    expect(hasPermission('ADMIN', 'problems:publish')).toBe(true);
    expect(hasPermission('ADMIN', 'classes:create')).toBe(true);
  });
});
