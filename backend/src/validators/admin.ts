import { z } from 'zod';

const page = {
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

export const adminProblemListSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  subject: z.string().min(1).max(50).optional(),
  q: z.string().trim().max(100).optional(),
  /** Only teacher proposals (DRAFT problems authored by teachers) */
  proposals: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  ...page,
});
export type AdminProblemListQuery = z.infer<typeof adminProblemListSchema>;

/** Admin-only metadata accepted next to problem content (editor and import) */
export const problemMetaSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
});

export const problemStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  reviewNote: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});

export const checkAnswerSchema = z.object({
  answerType: z.enum(['INTEGER', 'DECIMAL', 'TEXT', 'MULTIPLE_CHOICE']),
  correctAnswer: z.union([z.string().max(200), z.array(z.string().max(200)).max(10)]),
  tolerance: z.number().positive().optional().nullable(),
  answer: z.string().max(200),
});

export const importSchema = z.object({
  problems: z.array(z.unknown()).min(1).max(500),
  dryRun: z.boolean().default(false),
});

export const adminUserListSchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']).optional(),
  ...page,
});

export const adminUserUpdateSchema = z
  .object({
    role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']),
    isActive: z.boolean(),
  })
  .partial()
  .strict();

const name = z.string().trim().min(2).max(150);
const slug = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9-]+$/);

export const subjectSchema = z.object({
  slug,
  nameKy: name,
  nameRu: name,
  icon: z.string().min(1).max(40).default('BookOpen'),
  order: z.number().int().min(0).max(1000).default(0),
});

export const topicSchema = z.object({
  subjectSlug: slug,
  slug,
  nameKy: name,
  nameRu: name,
  order: z.number().int().min(0).max(1000).default(0),
});

export const schoolSchema = z.object({
  regionId: z.string().min(1).max(40),
  nameKy: name,
  nameRu: name,
  district: z
    .string()
    .trim()
    .max(150)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});

export const dailySetSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  problemSlug: z.string().min(1).max(120),
});
