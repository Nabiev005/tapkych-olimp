import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { bishkekDay } from '../../src/utils/dateRange.js';
import { signAccessToken } from '../../src/utils/jwt.js';
import { cleanupUsers, ensureGeo, hasTestDb, testEmail } from './helpers.js';

type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

describe.skipIf(!hasTestDb)('admin API (integration)', () => {
  let app = createApp();
  beforeEach(() => {
    app = createApp();
  });
  const people: Record<string, { id: string; auth: Record<string, string> }> = {};
  const P = 'itest-adm-';

  async function person(key: string, role: Role) {
    const geo = await ensureGeo();
    const user = await prisma.user.create({
      data: {
        email: testEmail(key),
        passwordHash: 'x',
        fullName: `Админ тест ${key}`,
        role,
        regionId: geo.region.id,
        schoolId: geo.school.id,
      },
    });
    people[key] = {
      id: user.id,
      auth: { Authorization: `Bearer ${signAccessToken({ sub: user.id, role })}` },
    };
  }

  const payload = (extra: Record<string, unknown> = {}) => ({
    subjectSlug: 'math',
    topicSlug: 'algebra',
    titleKy: 'Админ түзгөн маселе',
    statementKy: 'Эсептеңиз: $3 \\cdot 4$. Жоопту бүтүн сан менен жазыңыз.',
    answerType: 'INTEGER',
    correctAnswer: '12',
    solutionKy: '$3 \\cdot 4 = 12$.',
    difficulty: 1,
    olympiadLevel: 'SCHOOL',
    gradeFrom: 7,
    gradeTo: 8,
    ...extra,
  });

  beforeAll(async () => {
    await cleanupUsers();
    await person('admin', 'ADMIN');
    await person('teacher', 'TEACHER');
    await person('student', 'STUDENT');
  });

  afterAll(async () => {
    await prisma.problem.deleteMany({
      where: {
        OR: [
          { slug: { startsWith: P } },
          { slug: { startsWith: 'example-' } },
          { author: { email: { endsWith: '@itest.tapkych.local' } } },
        ],
      },
    });
    await prisma.topic.deleteMany({ where: { slug: 'itest-new-topic' } });
    await prisma.subject.deleteMany({ where: { slug: 'itest-new-subject' } });
    await cleanupUsers();
    await prisma.$disconnect();
  });

  it('only admins can use /api/admin', async () => {
    for (const who of ['student', 'teacher']) {
      expect((await request(app).get('/api/admin/stats').set(people[who]!.auth)).status).toBe(403);
      expect((await request(app).get('/api/admin/problems').set(people[who]!.auth)).status).toBe(
        403,
      );
    }
    expect((await request(app).get('/api/admin/users')).status).toBe(401);
  });

  it('creates, edits and publishes a problem; the editor sees correctAnswer, the catalog never does', async () => {
    const created = await request(app)
      .post('/api/admin/problems')
      .set(people.admin!.auth)
      .send(payload({ slug: `${P}one`, status: 'DRAFT' }));
    expect(created.status).toBe(201);
    const id = created.body.data.id as string;
    expect((await request(app).get(`/api/problems/${P}one`)).status).toBe(404);

    const editor = await request(app).get(`/api/admin/problems/${id}`).set(people.admin!.auth);
    expect(editor.body.data.correctAnswer).toBe('12');

    const updated = await request(app)
      .put(`/api/admin/problems/${id}`)
      .set(people.admin!.auth)
      .send(payload({ slug: `${P}one`, status: 'PUBLISHED', titleRu: 'Задача админа' }));
    expect(updated.status).toBe(200);
    const pub = await request(app).get(`/api/problems/${P}one`);
    expect(pub.status).toBe(200);
    expect(JSON.stringify(pub.body)).not.toContain('correctAnswer');

    const dup = await request(app)
      .post('/api/admin/problems')
      .set(people.admin!.auth)
      .send(payload({ slug: `${P}one` }));
    expect(dup.body.error.code).toBe('SLUG_TAKEN');
  });

  it('reviews teacher proposals: list, reject with a note, approve', async () => {
    const proposal = await request(app)
      .post('/api/proposals')
      .set(people.teacher!.auth)
      .send(payload());
    const slug = proposal.body.data.slug as string;
    const list = await request(app)
      .get('/api/admin/problems?proposals=true')
      .set(people.admin!.auth);
    const item = (
      list.body.data.items as { id: string; slug: string; author: { role: string } }[]
    ).find((p) => p.slug === slug)!;
    expect(item.author.role).toBe('TEACHER');

    await request(app)
      .post(`/api/admin/problems/${item.id}/status`)
      .set(people.admin!.auth)
      .send({ status: 'ARCHIVED', reviewNote: 'Шартын тактаңыз' });
    const mine = await request(app).get('/api/proposals').set(people.teacher!.auth);
    expect(mine.body.data[0]).toMatchObject({ status: 'ARCHIVED', reviewNote: 'Шартын тактаңыз' });

    await request(app)
      .post(`/api/admin/problems/${item.id}/status`)
      .set(people.admin!.auth)
      .send({ status: 'PUBLISHED' });
    expect((await request(app).get(`/api/problems/${slug}`)).status).toBe(200);
  });

  it('tests answers against the checker', async () => {
    const check = (answer: string) =>
      request(app)
        .post('/api/admin/problems/check-answer')
        .set(people.admin!.auth)
        .send({ answerType: 'DECIMAL', correctAnswer: '3.14', tolerance: 0.01, answer });
    expect((await check('3,145')).body.data.isCorrect).toBe(true);
    expect((await check('3.2')).body.data.isCorrect).toBe(false);
  });

  it('imports JSON with a dry run, per-item errors and upsert by slug', async () => {
    const file = JSON.parse(
      readFileSync(resolve(__dirname, '../../../docs/problems.example.json'), 'utf8'),
    ) as {
      problems: Record<string, unknown>[];
    };
    const bad = {
      ...file.problems[0],
      slug: undefined,
      gradeFrom: 11,
      gradeTo: 7,
      topicSlug: 'algebra',
    };
    const unknownTopic = { ...file.problems[1], topicSlug: 'no-such-topic' };
    const items = [...file.problems, bad, unknownTopic];

    const dry = await request(app)
      .post('/api/admin/problems/import')
      .set(people.admin!.auth)
      .send({ problems: items, dryRun: true });
    expect(dry.body.data).toMatchObject({ dryRun: true, created: 4, invalid: 2 });
    expect(await prisma.problem.count({ where: { slug: 'example-sum-of-angles' } })).toBe(0);
    const invalid = (
      dry.body.data.results as { index: number; errors: { path: string; message: string }[] }[]
    ).filter((r) => r.errors);
    expect(invalid[0]!.errors).toContainEqual({
      path: 'gradeTo',
      message: 'Акыркы класс биринчисинен кичине болбошу керек.',
    });
    expect(invalid[1]!.errors[0]!.message).toBe('Мындай предмет же тема жок.');

    const real = await request(app)
      .post('/api/admin/problems/import')
      .set(people.admin!.auth)
      .send({ problems: file.problems });
    expect(real.body.data).toMatchObject({ created: 4, updated: 0, invalid: 0 });
    const again = await request(app)
      .post('/api/admin/problems/import')
      .set(people.admin!.auth)
      .send({ problems: [file.problems[0]] });
    expect(again.body.data).toMatchObject({ created: 0, updated: 1 });

    expect(
      (
        await request(app)
          .post('/api/admin/problems/import')
          .set(people.teacher!.auth)
          .send({ problems: file.problems })
      ).status,
    ).toBe(403);
  });

  it('manages users: search, role change, block (not themselves)', async () => {
    const list = await request(app)
      .get('/api/admin/users')
      .query({ q: 'Админ тест student' })
      .set(people.admin!.auth);
    expect(list.body.data.items.map((u: { id: string }) => u.id)).toEqual([people.student!.id]);

    const promoted = await request(app)
      .patch(`/api/admin/users/${people.student!.id}`)
      .set(people.admin!.auth)
      .send({ role: 'TEACHER' });
    expect(promoted.body.data.role).toBe('TEACHER');
    await request(app)
      .patch(`/api/admin/users/${people.student!.id}`)
      .set(people.admin!.auth)
      .send({ isActive: false });
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: people.student!.id } })).isActive,
    ).toBe(false);

    const self = await request(app)
      .patch(`/api/admin/users/${people.admin!.id}`)
      .set(people.admin!.auth)
      .send({ isActive: false });
    expect(self.body.error.code).toBe('CANNOT_CHANGE_SELF');
  });

  it('manages subjects, topics and schools', async () => {
    const subject = await request(app).post('/api/admin/subjects').set(people.admin!.auth).send({
      slug: 'itest-new-subject',
      nameKy: 'Химия',
      nameRu: 'Химия',
      icon: 'FlaskConical',
      order: 9,
    });
    expect(subject.status).toBe(201);
    const topic = await request(app).post('/api/admin/topics').set(people.admin!.auth).send({
      subjectSlug: 'itest-new-subject',
      slug: 'itest-new-topic',
      nameKy: 'Органикалык химия',
      nameRu: 'Органическая химия',
    });
    expect(topic.status).toBe(201);
    const tax = await request(app).get('/api/admin/taxonomy').set(people.admin!.auth);
    expect(
      tax.body.data.find((s: { slug: string }) => s.slug === 'itest-new-subject').topics,
    ).toHaveLength(1);

    const geo = await ensureGeo();
    const school = await request(app).post('/api/admin/schools').set(people.admin!.auth).send({
      regionId: geo.region.id,
      nameKy: 'Жаңы тест мектеби',
      nameRu: 'Новая тестовая школа',
    });
    expect(school.status).toBe(201);
    await prisma.school.delete({ where: { id: school.body.data.id } });
  });

  it('schedules the daily problem and returns statistics', async () => {
    const tomorrow = new Date(`${bishkekDay()}T00:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const date = tomorrow.toISOString().slice(0, 10);
    const someProblem = await prisma.problem.findFirstOrThrow({ where: { status: 'PUBLISHED' } });
    const set = await request(app)
      .put('/api/admin/daily')
      .set(people.admin!.auth)
      .send({ date, problemSlug: someProblem.slug });
    expect(set.body.data.isAuto).toBe(false);
    const daily = await request(app).get('/api/admin/daily').set(people.admin!.auth);
    expect(daily.body.data.items).toContainEqual(expect.objectContaining({ date, isAuto: false }));
    await prisma.dailyProblem.deleteMany({ where: { date: tomorrow } });

    const stats = await request(app).get('/api/admin/stats').set(people.admin!.auth);
    expect(stats.status).toBe(200);
    expect(stats.body.data.activity).toHaveLength(14);
    expect(stats.body.data.users.total).toBeGreaterThan(0);
    expect(JSON.stringify(stats.body)).not.toContain('correctAnswer');
  });
});
