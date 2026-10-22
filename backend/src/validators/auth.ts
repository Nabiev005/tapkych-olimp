import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email());
// bcrypt only uses the first 72 bytes
const password = z.string().min(8).max(72);
const language = z.enum(['ky', 'ru']);

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    email,
    password,
    role: z.enum(['STUDENT', 'TEACHER']),
    grade: z.number().int().min(7).max(11).optional(),
    regionId: z.string().min(1),
    schoolId: z.string().min(1).optional(),
    customSchoolName: z.string().trim().min(2).max(150).optional(),
    language: language.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.role === 'STUDENT' && value.grade === undefined) {
      ctx.addIssue({ code: 'custom', path: ['grade'], message: 'validation.gradeRequired' });
    }
    if (!value.schoolId && !value.customSchoolName) {
      ctx.addIssue({ code: 'custom', path: ['schoolId'], message: 'validation.schoolRequired' });
    }
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(200),
  password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: password,
});

export const updateMeSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    language,
    grade: z.number().int().min(7).max(11).nullable(),
    regionId: z.string().min(1),
    schoolId: z.string().min(1).nullable(),
    customSchoolName: z.string().trim().min(2).max(150).nullable(),
    isProfilePublic: z.boolean(),
  })
  .partial()
  .strict();
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
