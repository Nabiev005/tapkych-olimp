import { describe, expect, it } from 'vitest';
import { checkAnswer, type CheckableProblem } from '../src/services/answerChecker.js';

const p = (
  answerType: CheckableProblem['answerType'],
  correctAnswer: unknown,
  tolerance: number | null = null,
): CheckableProblem => ({ answerType, correctAnswer, tolerance });

describe('answerChecker — INTEGER', () => {
  const problem = p('INTEGER', '12');
  it('accepts exact matches with spaces, + and leading zeros', () => {
    for (const a of ['12', ' 12 ', '+12', '012', '1 2'])
      expect(checkAnswer(problem, a), a).toBe(true);
  });
  it('rejects other values and non-integers', () => {
    for (const a of ['13', '12.0', '12,5', 'twelve', '', '   ', '1e1'])
      expect(checkAnswer(problem, a), a).toBe(false);
  });
  it('handles negatives (incl. unicode minus) and big numbers', () => {
    expect(checkAnswer(p('INTEGER', '-13'), '-13')).toBe(true);
    expect(checkAnswer(p('INTEGER', '-13'), '−13')).toBe(true);
    expect(checkAnswer(p('INTEGER', '-13'), '13')).toBe(false);
    expect(checkAnswer(p('INTEGER', '0'), '-0')).toBe(true);
    expect(checkAnswer(p('INTEGER', '123456789012345678901'), '123456789012345678901')).toBe(true);
    expect(checkAnswer(p('INTEGER', '123456789012345678901'), '123456789012345678902')).toBe(false);
  });
});

describe('answerChecker — DECIMAL', () => {
  const problem = p('DECIMAL', '3.14', 0.01);
  it('accepts comma and dot within tolerance', () => {
    for (const a of ['3.14', '3,14', ' 3,14 ', '3.15', '3.13', '3,140'])
      expect(checkAnswer(problem, a), a).toBe(true);
  });
  it('rejects values outside tolerance and garbage', () => {
    for (const a of ['3.16', '3.12', '3,14,1', 'pi', '', '3.14.1'])
      expect(checkAnswer(problem, a), a).toBe(false);
  });
  it('uses a tiny default tolerance when none is set', () => {
    expect(checkAnswer(p('DECIMAL', '1.2'), '1,2')).toBe(true);
    expect(checkAnswer(p('DECIMAL', '1.2'), '1.21')).toBe(false);
    expect(checkAnswer(p('DECIMAL', '0.5'), '.5')).toBe(true);
  });
});

describe('answerChecker — TEXT', () => {
  it('ignores case and whitespace', () => {
    const problem = p('TEXT', ['101101']);
    expect(checkAnswer(problem, ' 101101 ')).toBe(true);
    expect(checkAnswer(problem, '101 101')).toBe(true);
    expect(checkAnswer(problem, '1011010')).toBe(false);
  });
  it('supports several accepted answers and Kyrgyz letters', () => {
    const problem = p('TEXT', ['Бишкек', 'Фрунзе']);
    expect(checkAnswer(problem, 'БИШКЕК')).toBe(true);
    expect(checkAnswer(problem, 'фрунзе')).toBe(true);
    expect(checkAnswer(problem, 'Ош')).toBe(false);
    expect(checkAnswer(p('TEXT', 'Үч Өрдөк'), 'үч өрдөк')).toBe(true);
  });
  it('accepts a plain string as the correct answer', () => {
    expect(checkAnswer(p('TEXT', 'abc'), 'ABC')).toBe(true);
  });
});

describe('answerChecker — MULTIPLE_CHOICE', () => {
  it('matches the choice id exactly', () => {
    const problem = p('MULTIPLE_CHOICE', 'b');
    expect(checkAnswer(problem, 'b')).toBe(true);
    expect(checkAnswer(problem, ' b ')).toBe(true);
    expect(checkAnswer(problem, 'a')).toBe(false);
    expect(checkAnswer(problem, 'B')).toBe(false);
  });
});
