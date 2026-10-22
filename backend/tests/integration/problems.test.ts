import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { bishkekDayAsDate } from '../../src/utils/dateRange.js';
import { cleanupUsers, ensureGeo, hasTestDb, testEmail } from './helpers.js';

/** Recursively collects all object keys of a JSON value */
function allKeys(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => allKeys(v, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      allKeys(v, out);
    }
  }
  return out;
}

describe.skipIf(!hasTestDb)('problems API (integration)', () => {
  let app = createApp();
  beforeEach(() => {
    app = createApp();
  });

  const P = 'itest-p-';
  let subjectId = '';
  let topicId = '';

  async function createProblem(slug: string, extra: Record<string, unknown> = {}) {
    return prisma.problem.create({
      data: {
        slug: P + slug,
        subjectId,
        topicId,
        titleKy: `Тест маселе ${slug}`,
        titleRu: `Тестовая задача ${slug}`,
        statementKy: 'Шарт $x$',
        statementRu: null,
        answerType: 'INTEGER',
        correctAnswer: '42',
        solutionKy: 'Чечим',
        hintKy: 'Кеңеш',
        difficulty: 3,
        olympiadLevel: 'SCHOOL',
        gradeFrom: 7,
        gradeTo: 9,
        points: 10,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        ...extra,
      },
    });
  }

  async function newStudent() {
    const geo = await ensureGeo();
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Маселе Чечүүчү',
        email: testEmail('solver'),
        password: 'secret123',
        role: 'STUDENT',
        grade: 8,
        regionId: geo.region.id,
        schoolId: geo.school.id,
      });
    return {
      id: res.body.data.user.id as string,
      auth: { Authorization: `Bearer ${res.body.data.accessToken}` },
    };
  }

  const submit = (slug: string, auth: Record<string, string>, answer: string) =>
    request(app).post(`/api/problems/${P}${slug}/submit`).set(auth).send({ answer });

  beforeAll(async () => {
    const subject = await prisma.subject.upsert({
      where: { slug: 'itest-subject' },
      update: {},
      create: {
        slug: 'itest-subject',
        nameKy: 'Тест предмети',
        nameRu: 'Тест',
        icon: 'Sigma',
        order: 99,
      },
    });
    subjectId = subject.id;
    const topic = await prisma.topic.upsert({
      where: { subjectId_slug: { subjectId, slug: 'itest-topic' } },
      update: {},
      create: { subjectId, slug: 'itest-topic', nameKy: 'Тест темасы', nameRu: 'Тест' },
    });
    topicId = topic.id;
    await cleanupProblems();

    await createProblem('main');
    await createProblem('hint');
    await createProblem('solution');
    await createProblem('ratelimit');
    await createProblem('similar', { difficulty: 4 });
    await createProblem('far', { difficulty: 1 });
    await createProblem('draft', { status: 'DRAFT' });
    await createProblem('decimal', {
      answerType: 'DECIMAL',
      correctAnswer: '3.14',
      tolerance: 0.01,
    });
    await createProblem('daily');
    const hidden = await createProblem('in-contest');
    const contest = await prisma.contest.create({
      data: {
        id: 'itest-contest',
        titleKy: 'Тест жарыш',
        descriptionKy: '—',
        startsAt: new Date(Date.now() + 86_400_000),
        endsAt: new Date(Date.now() + 2 * 86_400_000),
        durationMinutes: 60,
        status: 'PUBLISHED',
      },
    });
    await prisma.contestProblem.create({
      data: { contestId: contest.id, problemId: hidden.id, points: 100 },
    });
  });

  async function cleanupProblems() {
    await prisma.contest.deleteMany({ where: { id: 'itest-contest' } });
    await prisma.dailyProblem.deleteMany({ where: { problem: { slug: { startsWith: P } } } });
    await prisma.problem.deleteMany({ where: { slug: { startsWith: P } } });
  }

  afterAll(async () => {
    await cleanupUsers();
    await cleanupProblems();
    await prisma.$disconnect();
  });

  it('never sends correctAnswer in list or detail responses', async () => {
    const student = await newStudent();
    const responses = [
      await request(app).get('/api/problems').query({ subject: 'itest-subject', pageSize: 50 }),
      await request(app).get(`/api/problems/${P}main`),
      await request(app).get(`/api/problems/${P}main`).set(student.auth),
      await submit('main', student.auth, '1'),
      await request(app).post(`/api/problems/${P}hint/hint`).set(student.auth),
    ];
    for (const res of responses) {
      expect(res.status).toBeLessThan(400);
      const keys = allKeys(res.body);
      expect(keys.has('correctAnswer')).toBe(false);
      expect(keys.has('tolerance')).toBe(false);
    }
    // Hint / solution texts are not exposed before they are unlocked
    const detail = responses[1]!.body.data;
    expect(detail.hint).toBeNull();
    expect(detail.solution).toBeNull();
    expect(detail.hasHint).toBe(true);
  });

  it('lists only published problems that are not in an upcoming contest', async () => {
    const res = await request(app)
      .get('/api/problems')
      .query({ subject: 'itest-subject', pageSize: 50 });
    const slugs = (res.body.data.items as { slug: string }[]).map((p) => p.slug);
    expect(slugs).toContain(`${P}main`);
    expect(slugs).not.toContain(`${P}draft`);
    expect(slugs).not.toContain(`${P}in-contest`);
    expect((await request(app).get(`/api/problems/${P}in-contest`)).status).toBe(404);
    expect((await request(app).get(`/api/problems/${P}draft`)).status).toBe(404);
  });

  it('filters, searches, sorts and paginates', async () => {
    const base = { subject: 'itest-subject' };
    const byDiff = await request(app)
      .get('/api/problems')
      .query({ ...base, difficulty: '1,4' });
    expect((byDiff.body.data.items as { slug: string }[]).map((p) => p.slug).sort()).toEqual([
      `${P}far`,
      `${P}similar`,
    ]);

    const sorted = await request(app)
      .get('/api/problems')
      .query({ ...base, sort: 'difficulty' });
    expect(sorted.body.data.items[0].difficulty).toBe(1);

    const search = await request(app)
      .get('/api/problems')
      .query({ ...base, q: 'ТЕСТОВАЯ ЗАДАЧА MAIN' });
    expect(search.body.data.items.map((p: { slug: string }) => p.slug)).toEqual([`${P}main`]);

    const paged = await request(app)
      .get('/api/problems')
      .query({ ...base, pageSize: 2, page: 2 });
    // 8 visible: main, hint, solution, ratelimit, similar, far, decimal, daily
    expect(paged.body.data).toMatchObject({ page: 2, pageSize: 2, total: 8, totalPages: 4 });
    expect(paged.body.data.items).toHaveLength(2);

    const grade = await request(app)
      .get('/api/problems')
      .query({ ...base, grade: 11 });
    expect(grade.body.data.total).toBe(0);

    const bad = await request(app).get('/api/problems').query({ difficulty: '9' });
    expect(bad.status).toBe(400);
  });

  it('awards points once, with a first-try bonus, and updates level, streak and achievements', async () => {
    const student = await newStudent();
    const ok = await submit('main', student.auth, ' 42 ');
    expect(ok.status).toBe(200);
    // 10 × 2 (difficulty 3) × 1.1 (first try) = 22
    expect(ok.body.data).toMatchObject({
      isCorrect: true,
      pointsAwarded: 22,
      alreadySolved: false,
      totalPoints: 22,
      currentStreak: 1,
    });
    expect(ok.body.data.achievements.map((a: { code: string }) => a.code)).toContain('first-solve');

    const again = await submit('main', student.auth, '42');
    expect(again.body.data).toMatchObject({
      isCorrect: true,
      pointsAwarded: 0,
      alreadySolved: true,
    });

    const me = await request(app).get('/api/me').set(student.auth);
    expect(me.body.data).toMatchObject({ totalPoints: 22, currentStreak: 1 });

    const problem = await prisma.problem.findUniqueOrThrow({ where: { slug: `${P}main` } });
    expect(problem.solvedCount).toBeGreaterThanOrEqual(1);

    const list = await request(app)
      .get('/api/problems')
      .set(student.auth)
      .query({ subject: 'itest-subject', status: 'solved' });
    expect(
      list.body.data.items.map((p: { slug: string; userStatus: string }) => [p.slug, p.userStatus]),
    ).toEqual([[`${P}main`, 'SOLVED']]);
  });

  it('halves points after a hint and gives no first-try bonus after a wrong answer', async () => {
    const student = await newStudent();
    const hint = await request(app).post(`/api/problems/${P}hint/hint`).set(student.auth);
    expect(hint.body.data.hint.ky).toBe('Кеңеш');

    expect((await submit('hint', student.auth, '41')).body.data.isCorrect).toBe(false);
    const ok = await submit('hint', student.auth, '42');
    // 10 × 2 × 0.5 = 10, no first-try bonus
    expect(ok.body.data.pointsAwarded).toBe(10);

    const detail = await request(app).get(`/api/problems/${P}hint`).set(student.auth);
    expect(detail.body.data.hint.ky).toBe('Кеңеш');
    expect(detail.body.data.progress).toMatchObject({
      status: 'SOLVED',
      attempts: 2,
      hintOpened: true,
    });
    expect(detail.body.data.submissions).toHaveLength(2);
  });

  it('locks the solution until solved or 3 wrong attempts; opening it unsolved forfeits points', async () => {
    const student = await newStudent();
    const locked = await request(app).post(`/api/problems/${P}solution/solution`).set(student.auth);
    expect(locked.status).toBe(403);
    expect(locked.body.error.code).toBe('SOLUTION_LOCKED');

    for (const a of ['1', '2']) await submit('solution', student.auth, a);
    const third = await submit('solution', student.auth, '3');
    expect(third.body.data.canOpenSolution).toBe(true);

    const opened = await request(app).post(`/api/problems/${P}solution/solution`).set(student.auth);
    expect(opened.status).toBe(200);
    expect(opened.body.data.solution.ky).toBe('Чечим');

    const late = await submit('solution', student.auth, '42');
    expect(late.body.data).toMatchObject({ isCorrect: true, pointsAwarded: 0 });
  });

  it('accepts comma decimals and adds the daily bonus', async () => {
    const student = await newStudent();
    expect((await submit('decimal', student.auth, '3,145')).body.data.isCorrect).toBe(true);

    const daily = await prisma.problem.findUniqueOrThrow({ where: { slug: `${P}daily` } });
    await prisma.dailyProblem.deleteMany({ where: { date: bishkekDayAsDate() } });
    await prisma.dailyProblem.create({ data: { date: bishkekDayAsDate(), problemId: daily.id } });
    const res = await submit('daily', student.auth, '42');
    // 22 + 10 daily bonus
    expect(res.body.data).toMatchObject({ pointsAwarded: 32, dailyBonus: 10 });
  });

  it('requires login to submit and limits submissions to 5 per minute', async () => {
    expect(
      (await request(app).post(`/api/problems/${P}main/submit`).send({ answer: '1' })).status,
    ).toBe(401);

    const student = await newStudent();
    for (let i = 0; i < 5; i++) {
      expect((await submit('ratelimit', student.auth, String(i))).status).toBe(200);
    }
    const blocked = await submit('ratelimit', student.auth, '5');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
    // Other problems are not affected
    expect((await submit('main', student.auth, '0')).status).toBe(200);
  });

  it('suggests similar problems from the same topic with close difficulty', async () => {
    const res = await request(app).get(`/api/problems/${P}main`);
    const items = res.body.data.similar as { slug: string; difficulty: number }[];
    const similar = items.map((p) => p.slug);
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(4);
    // main has difficulty 3 → only 2..4
    expect(items.every((p) => p.difficulty >= 2 && p.difficulty <= 4)).toBe(true);
    expect(similar).not.toContain(`${P}main`);
    expect(similar).not.toContain(`${P}far`);
    expect(similar).not.toContain(`${P}in-contest`);
  });

  it('lists subjects with topics', async () => {
    const res = await request(app).get('/api/subjects');
    const subject = (res.body.data as { slug: string; topics: { slug: string }[] }[]).find(
      (s) => s.slug === 'itest-subject',
    );
    expect(subject?.topics.map((t) => t.slug)).toEqual(['itest-topic']);
    expect((await request(app).get('/api/subjects/itest-subject/topics')).body.data).toHaveLength(
      1,
    );
  });
});
