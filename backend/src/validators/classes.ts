import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().min(1).max(40) });

export const memberParamSchema = z.object({
  id: z.string().min(1).max(40),
  userId: z.string().min(1).max(40),
});

export const assignmentParamSchema = z.object({
  id: z.string().min(1).max(40),
  assignmentId: z.string().min(1).max(40),
});

export const createClassSchema = z.object({
  name: z.string().trim().min(2).max(80),
  grade: z.number().int().min(7).max(11).optional().nullable(),
});

export const joinClassSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/),
});

export const createAssignmentSchema = z.object({
  titleKy: z.string().trim().min(2).max(200),
  titleRu: z
    .string()
    .trim()
    .max(200)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  dueDate: z.iso.datetime({ offset: true }).optional().nullable(),
  problemSlugs: z.array(z.string().min(1).max(120)).min(1).max(30),
});
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
