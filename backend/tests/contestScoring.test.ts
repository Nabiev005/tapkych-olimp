import { describe, expect, it } from 'vitest';
import {
  contestPhase,
  personalDeadline,
  rankParticipants,
  scoreParticipant,
} from '../src/services/contestScoring.js';

const start = new Date('2026-11-01T04:00:00Z');
const at = (minutes: number) => new Date(start.getTime() + minutes * 60_000);
const problems = [
  { problemId: 'p1', points: 100 },
  { problemId: 'p2', points: 150 },
];

describe('scoreParticipant — hidden verdicts (last answer counts)', () => {
  it('uses the last answer per problem, no penalty', () => {
    const result = scoreParticipant(
      problems,
      [
        { problemId: 'p1', isCorrect: true, createdAt: at(5) },
        { problemId: 'p1', isCorrect: false, createdAt: at(10) }, // changed to a wrong answer
        { problemId: 'p2', isCorrect: false, createdAt: at(3) },
        { problemId: 'p2', isCorrect: true, createdAt: at(20) },
      ],
      start,
      false,
    );
    expect(result.score).toBe(150);
    expect(result.penalty).toBe(0);
    expect(result.problems).toEqual([
      { problemId: 'p1', solved: false, attempts: 2, points: 0 },
      { problemId: 'p2', solved: true, attempts: 2, points: 150 },
    ]);
  });
});

describe('scoreParticipant — shown verdicts (first correct + penalty)', () => {
  it('counts the first correct answer with time and wrong-attempt penalty', () => {
    const result = scoreParticipant(
      problems,
      [
        { problemId: 'p1', isCorrect: false, createdAt: at(2) },
        { problemId: 'p1', isCorrect: false, createdAt: at(4) },
        { problemId: 'p1', isCorrect: true, createdAt: at(12) },
        { problemId: 'p1', isCorrect: false, createdAt: at(30) }, // after solving: ignored
        { problemId: 'p2', isCorrect: false, createdAt: at(15) },
      ],
      start,
      true,
    );
    // p1: 12 minutes + 2 wrong × 10 = 32
    expect(result).toMatchObject({ score: 100, penalty: 32 });
    expect(result.problems[0]).toMatchObject({ solved: true, attempts: 4 });
    expect(result.problems[1]).toMatchObject({ solved: false, points: 0 });
  });
});

describe('rankParticipants', () => {
  it('sorts by score desc, penalty asc and shares ranks on full ties', () => {
    const ranked = rankParticipants([
      { id: 'a', score: 100, penalty: 30 },
      { id: 'b', score: 250, penalty: 90 },
      { id: 'c', score: 100, penalty: 10 },
      { id: 'd', score: 100, penalty: 30 },
      { id: 'e', score: 0, penalty: 0 },
    ]);
    expect(ranked.map((r) => [r.id, r.rank])).toEqual([
      ['b', 1],
      ['c', 2],
      ['a', 3],
      ['d', 3],
      ['e', 5],
    ]);
  });
});

describe('contest timing', () => {
  const contest = { startsAt: at(0), endsAt: at(180) };
  it('computes the phase', () => {
    expect(contestPhase(contest, at(-1))).toBe('upcoming');
    expect(contestPhase(contest, at(0))).toBe('live');
    expect(contestPhase(contest, at(179))).toBe('live');
    expect(contestPhase(contest, at(180))).toBe('finished');
  });
  it('caps the personal deadline by the contest end', () => {
    expect(personalDeadline(at(10), 120, contest.endsAt)).toEqual(at(130));
    expect(personalDeadline(at(100), 120, contest.endsAt)).toEqual(at(180));
  });
});
