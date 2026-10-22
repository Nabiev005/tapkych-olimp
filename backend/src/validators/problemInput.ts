import { z } from 'zod';

// Problem content as submitted by teachers (proposals) and admins (editor, import).
// Kyrgyz fields are required, Russian ones optional.

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const choiceSchema = z.object({
  id: z.string().regex(/^[a-z]$/),
  textKy: z.string().trim().min(1).max(500),
  textRu: optionalText(500),
});

export const problemInputSchema = z
  .object({
    subjectSlug: z.string().min(1).max(50),
    topicSlug: z.string().min(1).max(80),
    titleKy: z.string().trim().min(3).max(200),
    titleRu: optionalText(200),
    statementKy: z.string().trim().min(10).max(10_000),
    statementRu: optionalText(10_000),
    answerType: z.enum(['INTEGER', 'DECIMAL', 'TEXT', 'MULTIPLE_CHOICE']),
    correctAnswer: z.union([
      z.string().trim().min(1).max(200),
      z.array(z.string().trim().min(1).max(200)).min(1).max(10),
    ]),
    tolerance: z.number().positive().max(1_000_000).optional().nullable(),
    choices: z.array(choiceSchema).min(2).max(6).optional().nullable(),
    solutionKy: z.string().trim().min(3).max(20_000),
    solutionRu: optionalText(20_000),
    hintKy: optionalText(2_000),
    hintRu: optionalText(2_000),
    difficulty: z.number().int().min(1).max(5),
    olympiadLevel: z.enum(['SCHOOL', 'DISTRICT', 'REGION', 'NATIONAL', 'INTERNATIONAL']),
    gradeFrom: z.number().int().min(7).max(11),
    gradeTo: z.number().int().min(7).max(11),
    points: z.number().int().min(1).max(100).default(10),
    source: optionalText(200),
  })
  .superRefine((p, ctx) => {
    const answers = Array.isArray(p.correctAnswer) ? p.correctAnswer : [p.correctAnswer];
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message });

    if (p.gradeTo < p.gradeFrom) issue('gradeTo', 'validation.gradeRange');
    if (
      p.answerType === 'INTEGER' &&
      !answers.every((a) => /^[+-]?\d+$/.test(a.replace(/\s/g, '')))
    ) {
      issue('correctAnswer', 'validation.answerInteger');
    }
    if (p.answerType === 'DECIMAL') {
      if (!answers.every((a) => Number.isFinite(Number(a.replace(',', '.').replace(/\s/g, ''))))) {
        issue('correctAnswer', 'validation.answerDecimal');
      }
      if (!p.tolerance) issue('tolerance', 'validation.toleranceRequired');
    }
    if (p.answerType === 'MULTIPLE_CHOICE') {
      const ids = (p.choices ?? []).map((c) => c.id);
      if (ids.length < 2) issue('choices', 'validation.choicesRequired');
      else if (new Set(ids).size !== ids.length) issue('choices', 'validation.choicesUnique');
      if (answers.length !== 1 || !ids.includes(answers[0]!)) {
        issue('correctAnswer', 'validation.answerChoice');
      }
    }
  });

export type ProblemInput = z.infer<typeof problemInputSchema>;
