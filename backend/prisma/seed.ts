// Idempotent seed: safe to run multiple times (everything is upserted).
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { Prisma, PrismaClient, type Role } from '@prisma/client';
import { REGIONS, SCHOOLS } from './seed-data/geography.js';
import { ACHIEVEMENTS, SUBJECTS } from './seed-data/taxonomy.js';
import { CATALOG_PROBLEMS, CONTEST_PROBLEMS, type ProblemSeed } from './seed-data/problems.js';

const prisma = new PrismaClient();

export const DEMO_EMAIL_DOMAIN = 'demo.tapkych.com';

interface DemoUser {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  grade?: number;
  schoolId?: string;
  regionSlug: string;
}

// Passwords are documented in README.md. Remove with `npm run demo:remove -w backend`.
const DEMO_USERS: DemoUser[] = [
  {
    email: `admin@${DEMO_EMAIL_DOMAIN}`,
    password: 'Admin12345',
    fullName: 'Демо Администратор',
    role: 'ADMIN',
    regionSlug: 'bishkek',
  },
  {
    email: `teacher@${DEMO_EMAIL_DOMAIN}`,
    password: 'Teacher12345',
    fullName: 'Айгүл Мамытова',
    role: 'TEACHER',
    schoolId: 'school-bishkek-70',
    regionSlug: 'bishkek',
  },
  {
    email: `student1@${DEMO_EMAIL_DOMAIN}`,
    password: 'Student12345',
    fullName: 'Нурбек Асанов',
    role: 'STUDENT',
    grade: 8,
    schoolId: 'school-bishkek-70',
    regionSlug: 'bishkek',
  },
  {
    email: `student2@${DEMO_EMAIL_DOMAIN}`,
    password: 'Student12345',
    fullName: 'Айпери Токтогулова',
    role: 'STUDENT',
    grade: 9,
    schoolId: 'school-osh-city-17',
    regionSlug: 'osh-city',
  },
  {
    email: `student3@${DEMO_EMAIL_DOMAIN}`,
    password: 'Student12345',
    fullName: 'Эрлан Жумабеков',
    role: 'STUDENT',
    grade: 10,
    schoolId: 'school-issyk-kul-9',
    regionSlug: 'issyk-kul',
  },
];

async function seedGeography(): Promise<Map<string, string>> {
  const regionIds = new Map<string, string>();
  for (const [order, region] of REGIONS.entries()) {
    const row = await prisma.region.upsert({
      where: { slug: region.slug },
      update: { nameKy: region.nameKy, nameRu: region.nameRu, order },
      create: { ...region, order },
    });
    regionIds.set(region.slug, row.id);
  }
  for (const school of SCHOOLS) {
    const regionId = regionIds.get(school.regionSlug)!;
    const data = {
      nameKy: school.nameKy,
      nameRu: school.nameRu,
      regionId,
      district: school.district ?? null,
    };
    await prisma.school.upsert({
      where: { id: school.id },
      update: data,
      create: { id: school.id, ...data },
    });
  }
  return regionIds;
}

/** Returns "subject/topic" → { subjectId, topicId } */
async function seedTaxonomy(): Promise<Map<string, { subjectId: string; topicId: string }>> {
  const ids = new Map<string, { subjectId: string; topicId: string }>();
  for (const [order, subject] of SUBJECTS.entries()) {
    const { topics, ...subjectData } = subject;
    const subjectRow = await prisma.subject.upsert({
      where: { slug: subject.slug },
      update: { ...subjectData, order },
      create: { ...subjectData, order },
    });
    for (const [topicOrder, topic] of topics.entries()) {
      const topicRow = await prisma.topic.upsert({
        where: { subjectId_slug: { subjectId: subjectRow.id, slug: topic.slug } },
        update: { nameKy: topic.nameKy, nameRu: topic.nameRu, order: topicOrder },
        create: { ...topic, subjectId: subjectRow.id, order: topicOrder },
      });
      ids.set(`${subject.slug}/${topic.slug}`, { subjectId: subjectRow.id, topicId: topicRow.id });
    }
  }
  return ids;
}

async function seedAchievements(): Promise<void> {
  for (const [order, achievement] of ACHIEVEMENTS.entries()) {
    await prisma.achievement.upsert({
      where: { code: achievement.code },
      update: { ...achievement, order },
      create: { ...achievement, order },
    });
  }
}

async function seedDemoUsers(regionIds: Map<string, string>): Promise<Map<string, string>> {
  const userIds = new Map<string, string>();
  for (const user of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    const row = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        passwordHash,
        fullName: user.fullName,
        role: user.role,
        grade: user.grade ?? null,
        schoolId: user.schoolId ?? null,
        regionId: regionIds.get(user.regionSlug) ?? null,
        emailVerified: true,
      },
    });
    userIds.set(user.email, row.id);
  }
  return userIds;
}

async function upsertProblem(
  problem: ProblemSeed,
  taxonomy: Map<string, { subjectId: string; topicId: string }>,
  authorId: string | null,
): Promise<string> {
  const refs = taxonomy.get(`${problem.subjectSlug}/${problem.topicSlug}`);
  if (!refs)
    throw new Error(`Unknown topic ${problem.subjectSlug}/${problem.topicSlug} (${problem.slug})`);

  const data = {
    subjectId: refs.subjectId,
    topicId: refs.topicId,
    titleKy: problem.titleKy,
    titleRu: problem.titleRu ?? null,
    statementKy: problem.statementKy,
    statementRu: problem.statementRu ?? null,
    answerType: problem.answerType,
    correctAnswer: problem.correctAnswer,
    tolerance: problem.tolerance ?? null,
    choices: problem.choices
      ? problem.choices.map((c) => ({ id: c.id, textKy: c.textKy, textRu: c.textRu ?? null }))
      : Prisma.DbNull,
    solutionKy: problem.solutionKy,
    solutionRu: problem.solutionRu ?? null,
    hintKy: problem.hintKy ?? null,
    hintRu: problem.hintRu ?? null,
    difficulty: problem.difficulty,
    olympiadLevel: problem.olympiadLevel,
    gradeFrom: problem.gradeFrom,
    gradeTo: problem.gradeTo,
    points: problem.points ?? 10,
    source: problem.source ?? null,
    status: 'PUBLISHED' as const,
  };

  const row = await prisma.problem.upsert({
    where: { slug: problem.slug },
    update: data,
    create: { ...data, slug: problem.slug, authorId, publishedAt: new Date() },
  });
  return row.id;
}

async function seedDemoClass(userIds: Map<string, string>): Promise<void> {
  const teacherId = userIds.get(`teacher@${DEMO_EMAIL_DOMAIN}`);
  if (!teacherId) return;
  const demoClass = await prisma.class.upsert({
    where: { joinCode: 'DEMO8A' },
    update: {},
    create: {
      name: '8-А математика',
      teacherId,
      joinCode: 'DEMO8A',
      schoolId: 'school-bishkek-70',
      grade: 8,
    },
  });
  for (const email of [`student1@${DEMO_EMAIL_DOMAIN}`, `student2@${DEMO_EMAIL_DOMAIN}`]) {
    const userId = userIds.get(email);
    if (!userId) continue;
    await prisma.classMember.upsert({
      where: { classId_userId: { classId: demoClass.id, userId } },
      update: {},
      create: { classId: demoClass.id, userId },
    });
  }
}

async function seedUpcomingContest(problemIds: string[], authorId: string | null): Promise<void> {
  const mathSubject = await prisma.subject.findUnique({ where: { slug: 'math' } });
  // One week from now, 10:00 Asia/Bishkek (UTC+6)
  const startsAt = new Date();
  startsAt.setUTCDate(startsAt.getUTCDate() + 7);
  startsAt.setUTCHours(4, 0, 0, 0);
  const endsAt = new Date(startsAt.getTime() + 3 * 60 * 60 * 1000);

  const data = {
    titleKy: 'Күзгү математика турнири',
    titleRu: 'Осенний математический турнир',
    descriptionKy:
      'Тапкыч Олимптин биринчи онлайн турнири. Үч маселе, 120 мүнөт. Жарыш терезеси ачылгандан кийин каалаган убакта баштасаңыз болот.',
    descriptionRu:
      'Первый онлайн-турнир Тапкыч Олимпа. Три задачи, 120 минут. Начать можно в любой момент, пока открыто окно соревнования.',
    startsAt,
    endsAt,
    durationMinutes: 120,
    subjectId: mathSubject?.id ?? null,
    isPublic: true,
    showVerdicts: false,
    status: 'PUBLISHED' as const,
    createdById: authorId,
  };
  const contest = await prisma.contest.upsert({
    where: { id: 'contest-demo-autumn' },
    update: data,
    create: { id: 'contest-demo-autumn', ...data },
  });

  const contestPoints = [100, 150, 200];
  for (const [order, problemId] of problemIds.entries()) {
    const points = contestPoints[order] ?? 100;
    await prisma.contestProblem.upsert({
      where: { contestId_problemId: { contestId: contest.id, problemId } },
      update: { order, points },
      create: { contestId: contest.id, problemId, order, points },
    });
  }
}

async function main(): Promise<void> {
  const withDemoUsers = process.env.SEED_DEMO_USERS !== 'false';

  const regionIds = await seedGeography();
  const taxonomy = await seedTaxonomy();
  await seedAchievements();

  const userIds = withDemoUsers ? await seedDemoUsers(regionIds) : new Map<string, string>();
  const authorId = userIds.get(`admin@${DEMO_EMAIL_DOMAIN}`) ?? null;

  for (const problem of CATALOG_PROBLEMS) await upsertProblem(problem, taxonomy, authorId);
  const contestProblemIds: string[] = [];
  for (const problem of CONTEST_PROBLEMS) {
    contestProblemIds.push(await upsertProblem(problem, taxonomy, authorId));
  }

  if (withDemoUsers) await seedDemoClass(userIds);
  await seedUpcomingContest(contestProblemIds, authorId);

  console.log(
    `Seed done: ${REGIONS.length} regions, ${SCHOOLS.length} schools, ${SUBJECTS.length} subjects, ` +
      `${CATALOG_PROBLEMS.length + CONTEST_PROBLEMS.length} problems, ${ACHIEVEMENTS.length} achievements, ` +
      `${withDemoUsers ? DEMO_USERS.length : 0} demo users, 1 contest.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
