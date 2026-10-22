import { prisma } from '../../src/db.js';

export const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

export const TEST_EMAIL_DOMAIN = 'itest.tapkych.local';

export function testEmail(name: string): string {
  return `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@${TEST_EMAIL_DOMAIN}`;
}

/** Region + two schools (one in another region) owned by the tests */
export async function ensureGeo() {
  const region = await prisma.region.upsert({
    where: { slug: 'itest-region' },
    update: {},
    create: { slug: 'itest-region', nameKy: 'Тест облусу', nameRu: 'Тестовая область', order: 99 },
  });
  const otherRegion = await prisma.region.upsert({
    where: { slug: 'itest-other' },
    update: {},
    create: { slug: 'itest-other', nameKy: 'Башка облус', nameRu: 'Другая область', order: 100 },
  });
  const school = await prisma.school.upsert({
    where: { id: 'itest-school' },
    update: {},
    create: {
      id: 'itest-school',
      nameKy: 'Тест мектеби',
      nameRu: 'Тестовая школа',
      regionId: region.id,
    },
  });
  const otherSchool = await prisma.school.upsert({
    where: { id: 'itest-school-other' },
    update: {},
    create: {
      id: 'itest-school-other',
      nameKy: 'Башка мектеп',
      nameRu: 'Другая школа',
      regionId: otherRegion.id,
    },
  });
  return { region, otherRegion, school, otherSchool };
}

export async function cleanupUsers(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } } });
}

/** Extracts the refresh cookie value from a Set-Cookie header */
export function refreshCookie(setCookie: string[] | string | undefined): string | undefined {
  const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  return list.find((c) => c.startsWith('olimp_rt='))?.split(';')[0];
}
