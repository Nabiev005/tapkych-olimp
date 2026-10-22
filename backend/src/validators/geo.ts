import { z } from 'zod';

export const schoolSearchSchema = z.object({
  regionId: z.string().min(1).optional(),
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
