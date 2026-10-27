import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/utils/jwt.js';
import { cleanupUsers, ensureGeo, hasTestDb, testEmail } from './helpers.js';

type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';
const MIN = 60_000;

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

describe.skipIf(!hasTestDb)('contests (integration)', () => {
  let app = createApp();
  beforeEach(() => {
    app = createApp();
  });

  const people: Record<string, { id: string; auth: Record<string, string> }> = {};
  const P = 'itest-c-';
  let subjectId = '';
  let topicId = '';
  let classId = '';

  async function person(key: string, role: Role, isProfilePublic = true) {
    const geo = await ensureGeo();
    const user = await prisma.user.create({
      data: {
        email: testEmail(key),
        passwordHash: 'x',
        fullName: `Катышуучу ${key}`,
        role,
        grade: 9,
        regionId: geo.region.id,
        schoolId: geo.school.id,
        isProfilePublic,
      },
    });
    people[key] = {
      id: user.id,
      auth: { Authorization: `Bearer ${signAccessToken({ sub: user.id, role })}` },
    };
  }

  async function problem(slug: string, answer = '7') {
    return prisma.problem.create({
      data: {
        slug: P + slug,
        subjectId,
        topicId,
        titleKy: `Жарыш маселеси ${slug}`,
        statementKy: 'Шарт',
        answerType: 'INTEGER',
        correctAnswer: answer,
        solutionKy: 'Чечим',
        difficulty: 2,
        olympiadLevel: 'SCHOOL',
        gradeFrom: 7,
        gradeTo: 11,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
  }

  /** Contest with 2 problems; times are minutes relative to now */
  async function contest(
    id: string,
    opts: {
      start: number;
      end: number;
      duration?: number;
      showVerdicts?: boolean;
      classId?: string;
    },
  ) {
    const p1 = await problem(`${id}-1`, '7');
    const p2 = await problem(`${id}-2`, '9');
    const now = Date.now();
    await prisma.contest.create({
      data: {
        id: P + id,
        titleKy: `Жарыш ${id}`,
        descriptionKy: 'Сүрөттөмө',
        startsAt: new Date(now + opts.start * MIN),
        endsAt: new Date(now + opts.end * MIN),
        durationMinutes: opts.duration ?? 60,
        showVerdicts: opts.showVerdicts ?? false,
        isPublic: !opts.classId,
        classId: opts.classId ?? null,
        status: 'PUBLISHED',
        problems: {
          create: [
            { problemId: p1.id, points: 100, order: 0 },
            { problemId: p2.id, points: 200, order: 1 },
          ],
        },
      },
    });
    return { id: P + id, p1, p2 };
  }

  const api = (method: 'get' | 'post', path: string, who?: string) => {
    const r = request(app)[method](path);
    return who ? r.set(people[who]!.auth) : r;
  };

  beforeAll(async () => {
    await cleanupUsers();
    await cleanup();
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
    await person('s1', 'STUDENT');
    await person('s2', 'STUDENT', false);
    await person('outsider', 'STUDENT');
    await person('teacher', 'TEACHER');
    await person('admin', 'ADMIN');
    const klass = await prisma.class.create({
      data: { name: 'Тест класс', teacherId: people.teacher!.id, joinCode: 'ITC0NT' },
    });
    classId = klass.id;
    await prisma.classMember.create({ data: { classId, userId: people.s1!.id } });
  });

  async function cleanup() {
    await prisma.contest.deleteMany({
      where: { OR: [{ id: { startsWith: P } }, { titleKy: { startsWith: 'itest' } }] },
    });
    await prisma.problem.deleteMany({ where: { slug: { startsWith: P } } });
  }

  afterAll(async () => {
    await cleanup();
    await prisma.class.deleteMany({ where: { joinCode: 'ITC0NT' } });
    await cleanupUsers();
    await prisma.$disconnect();
  });

  it('upcoming: register works, problems are hidden, start is refused', async () => {
    const c = await contest('upcoming', { start: 60, end: 240 });
    const detail = await api('get', `/api/contests/${c.id}`, 's1');
    expect(detail.body.data).toMatchObject({ phase: 'upcoming', problems: [] });
    expect((await api('post', `/api/contests/${c.id}/register`, 's1')).status).toBe(200);
    const start = await api('post', `/api/contests/${c.id}/start`, 's1');
    expect(start.body.error.code).toBe('CONTEST_NOT_STARTED');
    expect((await api('get', `/api/contests/${c.id}`, 's1')).body.data.me.registered).toBe(true);
    expect((await api('post', `/api/contests/${c.id}/register`)).status).toBe(401);
  });

  it('live public contest hides its problems from the catalog until it ends', async () => {
    const c = await contest('hidden', { start: -5, end: 60 });
    expect((await api('get', `/api/problems/${c.p1.slug}`)).status).toBe(404);
    const done = await contest('done', { start: -300, end: -10 });
    expect((await api('get', `/api/problems/${done.p1.slug}`)).status).toBe(200);
  });

  it('hidden verdicts: last answer counts, no correctAnswer leaks, results locked until the end', async () => {
    const c = await contest('hiddenv', { start: -5, end: 120, duration: 60 });
    expect((await api('get', `/api/contests/${c.id}`, 's1')).body.data.problems).toEqual([]);

    const start = await api('post', `/api/contests/${c.id}/start`, 's1');
    expect(start.status).toBe(200);
    expect(start.body.data.active).toBe(true);
    const deadline = Date.parse(start.body.data.deadline);
    expect(deadline - Date.now()).toBeGreaterThan(55 * MIN);
    // Starting twice keeps the original start time
    const again = await api('post', `/api/contests/${c.id}/start`, 's1');
    expect(again.body.data.startedAt).toBe(start.body.data.startedAt);

    const detail = await api('get', `/api/contests/${c.id}`, 's1');
    expect(detail.body.data.problems).toHaveLength(2);
    expect(allKeys(detail.body).has('correctAnswer')).toBe(false);
    expect(detail.body.data.problems[0].slug).toBeNull();

    const send = (problemId: string, answer: string) =>
      api('post', `/api/contests/${c.id}/submit`, 's1').send({ problemId, answer });
    const first = await send(c.p1.id, '7');
    expect(first.body.data).toEqual({ saved: true, isCorrect: null, score: null });
    await send(c.p1.id, '8'); // changed to a wrong answer
    await send(c.p2.id, '9');

    const after = await api('get', `/api/contests/${c.id}`, 's1');
    expect(
      after.body.data.problems.map((p: { myAnswer: string; solved: null }) => [
        p.myAnswer,
        p.solved,
      ]),
    ).toEqual([
      ['8', null],
      ['9', null],
    ]);
    const participant = await prisma.contestParticipant.findUniqueOrThrow({
      where: { contestId_userId: { contestId: c.id, userId: people.s1!.id } },
    });
    expect(participant.score).toBe(200);

    expect((await api('get', `/api/contests/${c.id}/results`, 's1')).body.error.code).toBe(
      'RESULTS_NOT_READY',
    );
    expect((await api('get', `/api/contests/${c.id}/results`, 'admin')).status).toBe(200);

    expect((await api('post', `/api/contests/${c.id}/finish`, 's1')).status).toBe(200);
    const late = await send(c.p1.id, '7');
    expect(late.body.error.code).toBe('CONTEST_TIME_OVER');
  });

  it('shown verdicts return correctness and score', async () => {
    const c = await contest('shown', { start: -5, end: 120, showVerdicts: true });
    await api('post', `/api/contests/${c.id}/start`, 's1');
    const wrong = await api('post', `/api/contests/${c.id}/submit`, 's1').send({
      problemId: c.p1.id,
      answer: '1',
    });
    expect(wrong.body.data).toMatchObject({ isCorrect: false, score: 0 });
    const ok = await api('post', `/api/contests/${c.id}/submit`, 's1').send({
      problemId: c.p1.id,
      answer: '7',
    });
    expect(ok.body.data).toMatchObject({ isCorrect: true, score: 100 });
  });

  it('refuses answers after the personal deadline and for unknown problems', async () => {
    const c = await contest('deadline', { start: -200, end: 60, duration: 30 });
    await prisma.contestParticipant.create({
      data: { contestId: c.id, userId: people.s1!.id, startedAt: new Date(Date.now() - 45 * MIN) },
    });
    const res = await api('post', `/api/contests/${c.id}/submit`, 's1').send({
      problemId: c.p1.id,
      answer: '7',
    });
    expect(res.body.error.code).toBe('CONTEST_TIME_OVER');

    const other = await contest('foreign', { start: -5, end: 60 });
    await api('post', `/api/contests/${other.id}/start`, 's2');
    const foreign = await api('post', `/api/contests/${other.id}/submit`, 's2').send({
      problemId: c.p1.id,
      answer: '7',
    });
    expect(foreign.status).toBe(404);
    const notStarted = await api('post', `/api/contests/${other.id}/submit`, 's1').send({
      problemId: other.p1.id,
      answer: '7',
    });
    expect(notStarted.body.error.code).toBe('CONTEST_NOT_JOINED');
  });

  it('finished: ranked results with anonymous private profiles; problems link to the catalog', async () => {
    const c = await contest('finished', { start: -300, end: -10, duration: 60 });
    const startedAt = new Date(Date.now() - 280 * MIN);
    for (const key of ['s1', 's2']) {
      await prisma.contestParticipant.create({
        data: { contestId: c.id, userId: people[key]!.id, startedAt },
      });
    }
    await prisma.submission.createMany({
      data: [
        {
          userId: people.s1!.id,
          problemId: c.p1.id,
          contestId: c.id,
          answer: '7',
          isCorrect: true,
          createdAt: new Date(startedAt.getTime() + 5 * MIN),
        },
        {
          userId: people.s2!.id,
          problemId: c.p1.id,
          contestId: c.id,
          answer: '7',
          isCorrect: true,
          createdAt: new Date(startedAt.getTime() + 5 * MIN),
        },
        {
          userId: people.s2!.id,
          problemId: c.p2.id,
          contestId: c.id,
          answer: '9',
          isCorrect: true,
          createdAt: new Date(startedAt.getTime() + 9 * MIN),
        },
      ],
    });

    const res = await api('get', `/api/contests/${c.id}/results`);
    expect(res.status).toBe(200);
    const rows = res.body.data.rows as {
      rank: number;
      score: number;
      user: { id: string; fullName: string | null };
    }[];
    expect(rows.map((r) => [r.user.id, r.rank, r.score])).toEqual([
      [people.s2!.id, 1, 300],
      [people.s1!.id, 2, 100],
    ]);
    expect(rows[0]!.user.fullName).toBeNull();
    expect(rows[1]!.user.fullName).toBe('Катышуучу s1');
    expect(JSON.stringify(res.body)).not.toContain('@itest');

    const detail = await api('get', `/api/contests/${c.id}`);
    expect(detail.body.data.phase).toBe('finished');
    expect(detail.body.data.problems[0].slug).toBe(c.p1.slug);
    expect(detail.body.data.problems[0].solved).toBeNull();
  });

  it('class contests are visible only to the class; the list shows registrations', async () => {
    const c = await contest('class', { start: -5, end: 60, classId: 'placeholder' }).catch(
      () => null,
    );
    expect(c).toBeNull(); // unknown class id is rejected by the FK
    const real = await contest('class2', { start: -5, end: 60, classId });
    const ids = async (who?: string) =>
      ((await api('get', '/api/contests', who)).body.data as { id: string }[]).map((x) => x.id);
    expect(await ids('s1')).toContain(real.id);
    expect(await ids('teacher')).toContain(real.id);
    expect(await ids('outsider')).not.toContain(real.id);
    expect(await ids()).not.toContain(real.id);
    expect((await api('get', `/api/contests/${real.id}`, 'outsider')).status).toBe(404);
    // Class contests don't hide catalog problems
    expect((await api('get', `/api/problems/${real.p1.slug}`)).status).toBe(200);
  });

  it('creating: admins public, teachers only for own classes, validation of the window', async () => {
    const slugs = [(await problem('create-1')).slug, (await problem('create-2')).slug];
    const body = {
      titleKy: 'itest жаңы жарыш',
      startsAt: new Date(Date.now() + 60 * MIN).toISOString(),
      endsAt: new Date(Date.now() + 240 * MIN).toISOString(),
      durationMinutes: 90,
      problems: slugs.map((slug) => ({ slug, points: 100 })),
    };
    expect((await api('post', '/api/contests', 's1').send(body)).status).toBe(403);
    expect((await api('post', '/api/contests', 'teacher').send(body)).status).toBe(403);
    expect((await api('post', '/api/contests', 'admin').send(body)).status).toBe(201);
    // Those problems are now hidden by the upcoming public contest, so the class contest
    // must use other (visible) problems
    const hidden = await api('post', '/api/contests', 'teacher').send({ ...body, classId });
    expect(hidden.body.error.code).toBe('PROBLEMS_UNAVAILABLE');
    const visibleSlugs = [(await problem('create-3')).slug];
    const classBody = {
      ...body,
      classId,
      problems: visibleSlugs.map((slug) => ({ slug, points: 50 })),
    };
    expect((await api('post', '/api/contests', 'teacher').send(classBody)).status).toBe(201);

    const otherClass = await prisma.class.create({
      data: { name: 'Башка', teacherId: people.admin!.id, joinCode: 'ITC0N2' },
    });
    expect(
      (await api('post', '/api/contests', 'teacher').send({ ...body, classId: otherClass.id }))
        .status,
    ).toBe(404);
    await prisma.class.delete({ where: { id: otherClass.id } });

    const bad = await api('post', '/api/contests?lang=ru', 'admin').send({
      ...body,
      durationMinutes: 600,
    });
    expect(bad.body.error.details.fields).toContainEqual({
      path: 'durationMinutes',
      message: 'Длительность не может превышать окно соревнования.',
    });
  });
});
