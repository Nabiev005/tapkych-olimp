import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/utils/jwt.js';
import { cleanupUsers, ensureGeo, hasTestDb, testEmail } from './helpers.js';

type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

describe.skipIf(!hasTestDb)('classes, assignments, proposals (integration)', () => {
  let app = createApp();
  beforeEach(() => {
    app = createApp();
  });

  const people: Record<string, { id: string; auth: Record<string, string> }> = {};
  let slugs: string[] = [];

  async function person(key: string, role: Role) {
    const geo = await ensureGeo();
    const user = await prisma.user.create({
      data: {
        email: testEmail(key),
        passwordHash: 'x',
        fullName: `Адам ${key}`,
        role,
        grade: role === 'STUDENT' ? 8 : null,
        regionId: geo.region.id,
        schoolId: geo.school.id,
      },
    });
    people[key] = {
      id: user.id,
      auth: { Authorization: `Bearer ${signAccessToken({ sub: user.id, role })}` },
    };
  }

  beforeAll(async () => {
    await cleanupUsers();
    await person('teacher', 'TEACHER');
    await person('otherTeacher', 'TEACHER');
    await person('s1', 'STUDENT');
    await person('s2', 'STUDENT');
    await person('outsider', 'STUDENT');
    const problems = await prisma.problem.findMany({
      where: { status: 'PUBLISHED', contestProblems: { none: {} } },
      orderBy: { slug: 'asc' },
      take: 2,
      select: { slug: true },
    });
    slugs = problems.map((p) => p.slug);
  });

  afterAll(async () => {
    await prisma.problem.deleteMany({
      where: { author: { email: { endsWith: '@itest.tapkych.local' } } },
    });
    await cleanupUsers();
    await prisma.$disconnect();
  });

  async function newClass(name = '8-Б математика') {
    const res = await request(app)
      .post('/api/classes')
      .set(people.teacher!.auth)
      .send({ name, grade: 8 });
    expect(res.status).toBe(201);
    return res.body.data as { id: string; joinCode: string };
  }

  it('teachers create classes with a unique 6-character code; students cannot', async () => {
    const klass = await newClass();
    expect(klass.joinCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    const denied = await request(app)
      .post('/api/classes')
      .set(people.s1!.auth)
      .send({ name: 'Менин классым' });
    expect(denied.status).toBe(403);
  });

  it('students join by code (case-insensitive, idempotent); bad codes and own class are rejected', async () => {
    const klass = await newClass();
    const join = (key: string, code: string) =>
      request(app).post('/api/classes/join').set(people[key]!.auth).send({ code });

    expect((await join('s1', klass.joinCode.toLowerCase())).status).toBe(200);
    expect((await join('s1', klass.joinCode)).status).toBe(200);
    const bad = await join('s2', 'ZZZZZZ');
    expect(bad.status).toBe(404);
    expect(bad.body.error.code).toBe('INVALID_JOIN_CODE');
    expect((await join('teacher', klass.joinCode)).body.error.code).toBe('OWN_CLASS');

    const list = await request(app).get('/api/classes').set(people.s1!.auth);
    expect(list.body.data.joined.map((c: { id: string }) => c.id)).toContain(klass.id);
    const teacherList = await request(app).get('/api/classes').set(people.teacher!.auth);
    const mine = teacherList.body.data.teaching.find((c: { id: string }) => c.id === klass.id);
    expect(mine.memberCount).toBe(1);
  });

  it('class page: teacher sees members and code, member sees no code, outsiders get 404', async () => {
    const klass = await newClass();
    await request(app)
      .post('/api/classes/join')
      .set(people.s1!.auth)
      .send({ code: klass.joinCode });

    const teacher = await request(app).get(`/api/classes/${klass.id}`).set(people.teacher!.auth);
    expect(teacher.body.data).toMatchObject({ isTeacher: true, joinCode: klass.joinCode });
    expect(teacher.body.data.members.map((m: { id: string }) => m.id)).toEqual([people.s1!.id]);
    expect(JSON.stringify(teacher.body)).not.toContain('@itest');

    const member = await request(app).get(`/api/classes/${klass.id}`).set(people.s1!.auth);
    expect(member.body.data.isTeacher).toBe(false);
    expect(member.body.data.joinCode).toBeUndefined();
    expect(member.body.data.members).toEqual([]);

    expect(
      (await request(app).get(`/api/classes/${klass.id}`).set(people.outsider!.auth)).status,
    ).toBe(404);
    expect(
      (await request(app).get(`/api/classes/${klass.id}`).set(people.otherTeacher!.auth)).status,
    ).toBe(404);
  });

  it('assignments: results matrix for the teacher, own status for students, dashboard entry', async () => {
    const klass = await newClass();
    for (const s of ['s1', 's2']) {
      await request(app)
        .post('/api/classes/join')
        .set(people[s]!.auth)
        .send({ code: klass.joinCode });
    }
    const created = await request(app)
      .post(`/api/classes/${klass.id}/assignments`)
      .set(people.teacher!.auth)
      .send({
        titleKy: 'Үй тапшырмасы',
        problemSlugs: slugs,
        dueDate: new Date(Date.now() + 86_400_000).toISOString(),
      });
    expect(created.status).toBe(201);
    const assignmentId = created.body.data.id as string;

    // s1 solves the first problem, attempts the second
    const [p1, p2] = await prisma.problem.findMany({
      where: { slug: { in: slugs } },
      orderBy: { slug: 'asc' },
    });
    await prisma.problemProgress.createMany({
      data: [
        {
          userId: people.s1!.id,
          problemId: p1!.id,
          status: 'SOLVED',
          attempts: 1,
          solvedAt: new Date(),
        },
        { userId: people.s1!.id, problemId: p2!.id, status: 'ATTEMPTED', attempts: 2 },
      ],
    });

    const results = await request(app)
      .get(`/api/classes/${klass.id}/assignments/${assignmentId}`)
      .set(people.teacher!.auth);
    expect(results.status).toBe(200);
    const byId = Object.fromEntries(
      (results.body.data.students as { id: string; results: (string | null)[] }[]).map((s) => [
        s.id,
        s.results,
      ]),
    );
    expect(byId[people.s1!.id]).toEqual(['SOLVED', 'ATTEMPTED']);
    expect(byId[people.s2!.id]).toEqual([null, null]);
    expect(JSON.stringify(results.body)).not.toContain('correctAnswer');

    const student = await request(app)
      .get(`/api/classes/${klass.id}/assignments/${assignmentId}`)
      .set(people.s1!.auth);
    expect(student.body.data.students).toEqual([]);
    expect(student.body.data.problems.map((p: { userStatus: string }) => p.userStatus)).toEqual([
      'SOLVED',
      'ATTEMPTED',
    ]);

    const dashboard = await request(app).get('/api/me/dashboard').set(people.s1!.auth);
    expect(dashboard.body.data.assignments).toContainEqual(
      expect.objectContaining({ id: assignmentId, problemCount: 2, solvedCount: 1 }),
    );

    const stats = await request(app)
      .get(`/api/classes/${klass.id}/stats`)
      .set(people.teacher!.auth);
    expect(stats.body.data.memberCount).toBe(2);
    // hardest first: nobody solved p2
    expect(stats.body.data.problems[0]).toMatchObject({ slug: p2!.slug, solvedPercent: 0 });

    const classPage = await request(app).get(`/api/classes/${klass.id}`).set(people.teacher!.auth);
    expect(classPage.body.data.assignments[0]).toMatchObject({
      problemCount: 2,
      completedCount: 0,
    });
  });

  it('rejects unknown problems and foreign classes when creating assignments', async () => {
    const klass = await newClass();
    const bad = await request(app)
      .post(`/api/classes/${klass.id}/assignments`)
      .set(people.teacher!.auth)
      .send({ titleKy: 'Тапшырма', problemSlugs: ['no-such-problem'] });
    expect(bad.body.error.code).toBe('PROBLEMS_UNAVAILABLE');
    const foreign = await request(app)
      .post(`/api/classes/${klass.id}/assignments`)
      .set(people.otherTeacher!.auth)
      .send({ titleKy: 'Тапшырма', problemSlugs: slugs });
    expect(foreign.status).toBe(404);
  });

  it('teacher removes a student; a student can leave', async () => {
    const klass = await newClass();
    for (const s of ['s1', 's2']) {
      await request(app)
        .post('/api/classes/join')
        .set(people[s]!.auth)
        .send({ code: klass.joinCode });
    }
    expect(
      (
        await request(app)
          .delete(`/api/classes/${klass.id}/members/${people.s1!.id}`)
          .set(people.s2!.auth)
      ).status,
    ).toBe(404);
    await request(app)
      .delete(`/api/classes/${klass.id}/members/${people.s1!.id}`)
      .set(people.teacher!.auth);
    await request(app).delete(`/api/classes/${klass.id}/members/me`).set(people.s2!.auth);
    expect(await prisma.classMember.count({ where: { classId: klass.id } })).toBe(0);
  });

  it('teachers propose problems as DRAFT (hidden from the catalog); validation is bilingual', async () => {
    const payload = {
      subjectSlug: 'math',
      topicSlug: 'algebra',
      titleKy: 'Сунушталган маселе',
      statementKy: 'Эсептеңиз: $2 + 2$. Жоопту бүтүн сан менен жазыңыз.',
      answerType: 'INTEGER',
      correctAnswer: '4',
      solutionKy: '$2 + 2 = 4$.',
      difficulty: 1,
      olympiadLevel: 'SCHOOL',
      gradeFrom: 7,
      gradeTo: 8,
    };
    const res = await request(app).post('/api/proposals').set(people.teacher!.auth).send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('DRAFT');
    expect(res.body.data.slug).toMatch(/^sunushtalgan-masele-[0-9a-f]{6}$/);
    expect((await request(app).get(`/api/problems/${res.body.data.slug}`)).status).toBe(404);

    const mine = await request(app).get('/api/proposals').set(people.teacher!.auth);
    expect(mine.body.data[0].slug).toBe(res.body.data.slug);

    expect(
      (await request(app).post('/api/proposals').set(people.s1!.auth).send(payload)).status,
    ).toBe(403);

    const invalid = await request(app)
      .post('/api/proposals?lang=ru')
      .set(people.teacher!.auth)
      .send({ ...payload, correctAnswer: 'четыре', gradeTo: 7, gradeFrom: 9 });
    expect(invalid.status).toBe(400);
    const fields = invalid.body.error.details.fields as { path: string; message: string }[];
    expect(fields).toContainEqual({
      path: 'gradeTo',
      message: 'Последний класс не может быть меньше первого.',
    });
    expect(fields).toContainEqual({
      path: 'correctAnswer',
      message: 'Правильный ответ должен быть целым числом.',
    });

    const mc = await request(app)
      .post('/api/proposals')
      .set(people.teacher!.auth)
      .send({
        ...payload,
        answerType: 'MULTIPLE_CHOICE',
        correctAnswer: 'c',
        choices: [
          { id: 'a', textKy: '3' },
          { id: 'b', textKy: '4' },
        ],
      });
    expect(mc.body.error.details.fields).toContainEqual({
      path: 'correctAnswer',
      message: 'Туура жооп катары варианттардын бирин тандаңыз.',
    });
  });
});
