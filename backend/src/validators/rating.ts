import { z } from 'zod';

const page = {
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
};

export const leaderboardQuerySchema = z.object({
  period: z.enum(['all', 'month', 'week']).default('all'),
  regionId: z.string().min(1).max(40).optional(),
  schoolId: z.string().min(1).max(40).optional(),
  grade: z.coerce.number().int().min(7).max(11).optional(),
  ...page,
});
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;

export const schoolLeaderboardQuerySchema = z.object({
  regionId: z.string().min(1).max(40).optional(),
  ...page,
});
export type SchoolLeaderboardQuery = z.infer<typeof schoolLeaderboardQuerySchema>;

export const userIdParamSchema = z.object({ id: z.string().min(1).max(40) });
