import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const createContestSchema = z
  .object({
    titleKy: z.string().trim().min(3).max(200),
    titleRu: optionalText(200),
    descriptionKy: z.string().trim().max(5000).default(''),
    descriptionRu: optionalText(5000),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    durationMinutes: z.number().int().min(5).max(600),
    classId: z.string().min(1).max(40).optional().nullable(),
    showVerdicts: z.boolean().default(false),
    problems: z
      .array(
        z.object({
          slug: z.string().min(1).max(120),
          points: z.number().int().min(1).max(1000),
        }),
      )
      .min(1)
      .max(30),
  })
  .superRefine((c, ctx) => {
    const windowMinutes = (Date.parse(c.endsAt) - Date.parse(c.startsAt)) / 60_000;
    if (windowMinutes <= 0) {
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'validation.contestWindow' });
    } else if (c.durationMinutes > windowMinutes) {
      ctx.addIssue({
        code: 'custom',
        path: ['durationMinutes'],
        message: 'validation.contestDuration',
      });
    }
    const slugs = c.problems.map((p) => p.slug);
    if (new Set(slugs).size !== slugs.length) {
      ctx.addIssue({ code: 'custom', path: ['problems'], message: 'validation.problemsUnique' });
    }
  });
export type CreateContestInput = z.infer<typeof createContestSchema>;

export const contestSubmitSchema = z.object({
  problemId: z.string().min(1).max(40),
  answer: z.string().trim().min(1).max(200),
});
