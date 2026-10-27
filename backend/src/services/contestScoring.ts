// Contest scoring (pure, unit-tested).
//
// Hidden verdicts (default, like an olympiad answer sheet): the LAST answer per problem
// counts; participants may change answers until their deadline. No penalty.
// Shown verdicts: the FIRST correct answer counts; penalty = minutes from the start to
// that answer + PENALTY_PER_WRONG for every wrong answer before it.
// Ranking: score desc, then penalty asc.

export const PENALTY_PER_WRONG_MINUTES = 10;

export interface ContestSubmission {
  problemId: string;
  isCorrect: boolean;
  createdAt: Date;
}

export interface ProblemResult {
  problemId: string;
  solved: boolean;
  /** Submissions made for this problem */
  attempts: number;
  points: number;
}

export interface ParticipantScore {
  score: number;
  penalty: number;
  problems: ProblemResult[];
}

export function scoreParticipant(
  problems: { problemId: string; points: number }[],
  submissions: ContestSubmission[],
  startedAt: Date,
  showVerdicts: boolean,
): ParticipantScore {
  let score = 0;
  let penalty = 0;
  const sorted = [...submissions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const results = problems.map(({ problemId, points }) => {
    const own = sorted.filter((s) => s.problemId === problemId);
    let solved = false;
    if (showVerdicts) {
      const firstCorrect = own.findIndex((s) => s.isCorrect);
      if (firstCorrect >= 0) {
        solved = true;
        const minutes = Math.floor(
          (own[firstCorrect]!.createdAt.getTime() - startedAt.getTime()) / 60_000,
        );
        penalty += Math.max(0, minutes) + firstCorrect * PENALTY_PER_WRONG_MINUTES;
      }
    } else {
      solved = own.length > 0 && own[own.length - 1]!.isCorrect;
    }
    if (solved) score += points;
    return { problemId, solved, attempts: own.length, points: solved ? points : 0 };
  });

  return { score, penalty, problems: results };
}

/** Dense ranks with ties on (score, penalty) */
export function rankParticipants<T extends { score: number; penalty: number }>(rows: T[]) {
  const sorted = [...rows].sort((a, b) => b.score - a.score || a.penalty - b.penalty);
  let rank = 0;
  return sorted.map((row, index) => {
    const prev = sorted[index - 1];
    if (!prev || prev.score !== row.score || prev.penalty !== row.penalty) rank = index + 1;
    return { ...row, rank };
  });
}

export type ContestPhase = 'upcoming' | 'live' | 'finished';

export function contestPhase(
  contest: { startsAt: Date; endsAt: Date },
  now: Date = new Date(),
): ContestPhase {
  if (now < contest.startsAt) return 'upcoming';
  if (now < contest.endsAt) return 'live';
  return 'finished';
}

/** Personal deadline: duration from the participant's start, capped by the contest end */
export function personalDeadline(startedAt: Date, durationMinutes: number, endsAt: Date): Date {
  return new Date(Math.min(startedAt.getTime() + durationMinutes * 60_000, endsAt.getTime()));
}
