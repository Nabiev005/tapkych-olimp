import { describe, expect, it } from 'vitest';
import { REGIONS, SCHOOLS } from '../prisma/seed-data/geography.js';
import { CATALOG_PROBLEMS, CONTEST_PROBLEMS } from '../prisma/seed-data/problems.js';
import { SUBJECTS } from '../prisma/seed-data/taxonomy.js';

const ALL = [...CATALOG_PROBLEMS, ...CONTEST_PROBLEMS];

describe('seed data', () => {
  it('has all regions of Kyrgyzstan and schools in each', () => {
    expect(REGIONS).toHaveLength(9);
    for (const region of REGIONS) {
      expect(SCHOOLS.filter((s) => s.regionSlug === region.slug).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('has at least 30 catalog problems: 15 math, 10 physics, 5 informatics', () => {
    const count = (slug: string) => CATALOG_PROBLEMS.filter((p) => p.subjectSlug === slug).length;
    expect(CATALOG_PROBLEMS.length).toBeGreaterThanOrEqual(30);
    expect(count('math')).toBeGreaterThanOrEqual(15);
    expect(count('physics')).toBeGreaterThanOrEqual(10);
    expect(count('informatics')).toBeGreaterThanOrEqual(5);
  });

  it('uses unique slugs and existing topics', () => {
    expect(new Set(ALL.map((p) => p.slug)).size).toBe(ALL.length);
    for (const p of ALL) {
      const subject = SUBJECTS.find((s) => s.slug === p.subjectSlug);
      expect(
        subject?.topics.some((t) => t.slug === p.topicSlug),
        p.slug,
      ).toBe(true);
    }
  });

  it('every problem is complete in both languages', () => {
    for (const p of ALL) {
      for (const field of [
        'titleKy',
        'titleRu',
        'statementKy',
        'statementRu',
        'solutionKy',
        'solutionRu',
        'hintKy',
        'hintRu',
      ] as const) {
        expect(p[field]?.trim(), `${p.slug}.${field}`).toBeTruthy();
      }
      expect(p.gradeFrom).toBeGreaterThanOrEqual(7);
      expect(p.gradeTo).toBeLessThanOrEqual(11);
      expect(p.gradeFrom).toBeLessThanOrEqual(p.gradeTo);
    }
  });

  it('answers match their answer type', () => {
    for (const p of ALL) {
      const answers = Array.isArray(p.correctAnswer) ? p.correctAnswer : [p.correctAnswer];
      expect(answers.length, p.slug).toBeGreaterThan(0);
      if (p.answerType === 'INTEGER') expect(answers[0], p.slug).toMatch(/^-?\d+$/);
      if (p.answerType === 'DECIMAL') {
        expect(Number.isFinite(Number(answers[0])), p.slug).toBe(true);
        expect(p.tolerance, p.slug).toBeGreaterThan(0);
      }
      if (p.answerType === 'MULTIPLE_CHOICE') {
        expect(
          p.choices?.some((c) => c.id === answers[0]),
          p.slug,
        ).toBe(true);
      }
    }
  });

  it('formulas have balanced $ delimiters', () => {
    for (const p of ALL) {
      for (const text of [
        p.statementKy,
        p.statementRu,
        p.solutionKy,
        p.solutionRu,
        p.hintKy,
        p.hintRu,
      ]) {
        const withoutCode = (text ?? '').replace(/```[\s\S]*?```/g, '');
        expect((withoutCode.match(/\$/g) ?? []).length % 2, `${p.slug}: ${text}`).toBe(0);
      }
    }
  });
});
