import { prisma } from '../db.js';

export function listRegions() {
  return prisma.region.findMany({
    orderBy: { order: 'asc' },
    select: { id: true, slug: true, nameKy: true, nameRu: true },
  });
}

export function searchSchools(params: { regionId?: string; q?: string; limit: number }) {
  const q = params.q?.trim();
  return prisma.school.findMany({
    where: {
      regionId: params.regionId,
      ...(q
        ? {
            OR: [
              { nameKy: { contains: q, mode: 'insensitive' } },
              { nameRu: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { nameKy: 'asc' },
    take: params.limit,
    select: { id: true, nameKy: true, nameRu: true, regionId: true, district: true },
  });
}
