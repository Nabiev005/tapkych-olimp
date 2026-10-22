import { z } from 'zod';

const difficultyList = z
  .string()
  .regex(/^[1-5](,[1-5])*$/)
  .transform((value) => [...new Set(value.split(',').map(Number))]);

export const problemListQuerySchema = z.object({
  subject: z.string().min(1).max(50).optional(),
  topic: z.string().min(1).max(80).optional(),
  difficulty: difficultyList.optional(),
  level: z.enum(['SCHOOL', 'DISTRICT', 'REGION', 'NATIONAL', 'INTERNATIONAL']).optional(),
  grade: z.coerce.number().int().min(7).max(11).optional(),
  status: z.enum(['solved', 'unsolved', 'attempted']).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['new', 'difficulty', 'popular']).default('new'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
export type ProblemListQuery = z.infer<typeof problemListQuerySchema>;

export const slugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
});

export const submitSchema = z.object({
  answer: z.string().trim().min(1).max(200),
});
