// Answer checking rules (7.4):
// INTEGER — exact match, spaces ignored, leading zeros / "+" allowed.
// DECIMAL — within tolerance, "3,14" equals "3.14".
// TEXT — case-insensitive, whitespace ignored, several accepted answers.
// MULTIPLE_CHOICE — the selected choice id.

export type AnswerType = 'INTEGER' | 'DECIMAL' | 'TEXT' | 'MULTIPLE_CHOICE';

export interface CheckableProblem {
  answerType: AnswerType;
  /** string | string[] (as stored in Problem.correctAnswer) */
  correctAnswer: unknown;
  tolerance: number | null;
}

const DEFAULT_TOLERANCE = 1e-9;

export function acceptedAnswers(correct: unknown): string[] {
  if (Array.isArray(correct)) return correct.map(String);
  if (correct === null || correct === undefined) return [];
  return [String(correct)];
}

const stripSpaces = (value: string) => value.replace(/\s+/g, '');

function parseInteger(value: string): bigint | null {
  const cleaned = stripSpaces(value).replace(/^\+/, '').replace(/[−–]/g, '-');
  if (!/^-?\d+$/.test(cleaned)) return null;
  return BigInt(cleaned);
}

function parseDecimal(value: string): number | null {
  const cleaned = stripSpaces(value).replace(',', '.').replace(/^\+/, '').replace(/[−–]/g, '-');
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function normalizeText(value: string): string {
  return stripSpaces(value.normalize('NFC')).toLocaleLowerCase('ky');
}

export function checkAnswer(problem: CheckableProblem, rawAnswer: string): boolean {
  const answer = rawAnswer.trim();
  if (!answer) return false;
  const accepted = acceptedAnswers(problem.correctAnswer);

  switch (problem.answerType) {
    case 'INTEGER': {
      const given = parseInteger(answer);
      return given !== null && accepted.some((c) => parseInteger(c) === given);
    }
    case 'DECIMAL': {
      const given = parseDecimal(answer);
      if (given === null) return false;
      const tolerance = problem.tolerance ?? DEFAULT_TOLERANCE;
      return accepted.some((c) => {
        const expected = parseDecimal(c);
        // Small epsilon absorbs floating-point noise at the tolerance boundary
        return expected !== null && Math.abs(given - expected) <= tolerance + 1e-12;
      });
    }
    case 'TEXT': {
      const given = normalizeText(answer);
      return accepted.some((c) => normalizeText(c) === given);
    }
    case 'MULTIPLE_CHOICE':
      return accepted.some((c) => c.trim() === answer);
    default:
      return false;
  }
}
