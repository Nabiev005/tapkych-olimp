import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { prisma } from '../../src/db.js';
import { LESSONS } from '../../src/content/lessons.js';
import { signAccessToken } from '../../src/utils/jwt.js';
import { cleanupUsers, ensureGeo, hasTestDb, testEmail } from './helpers.js';

const TEMPLATE =
  '<html><head><title>App</title><meta name="description" content="x" />' +
  '<link rel="canonical" href="https://example.com/" /></head>' +
  '<body><div id="root"></div></body></html>';

describe.skipIf(!hasTestDb)(
  'lessons, pre-rendered pages, sheets, achievements (integration)',
  () => {
    const app = createApp();
    const seoApp = createApp({ spaTemplate: TEMPLATE });
    const auth: Record<string, Record<string, string>> = {};
    const ids: Record<string, string> = {};

    async function person(key: string, role: 'STUDENT' | 'TEACHER') {
      const geo = await ensureGeo();
      const user = await prisma.user.create({
        data: {
          email: testEmail(key),
          passwordHash: 'x',
          fullName: `Адам ${key}`,
          role,
          grade: role === 'STUDENT' ? 9 : null,
          regionId: geo.region.id,
          schoolId: geo.school.id,
        },
      });
      ids[key] = user.id;
      auth[key] = { Authorization: `Bearer ${signAccessToken({ sub: user.id, role })}` };
    }

    beforeAll(async () => {
      await cleanupUsers();
      await person('teacher', 'TEACHER');
      await person('student', 'STUDENT');
    });

    afterAll(async () => {
      await prisma.problem.deleteMany({ where: { slug: 'itest-draft-secret' } });
      await cleanupUsers();
      await prisma.$disconnect();
    });

    it('lists lessons with problem counts and returns a lesson', async () => {
      const list = await request(app).get('/api/lessons').expect(200);
      expect(list.body.data).toHaveLength(LESSONS.length);
      const algebra = list.body.data.find((l: { slug: string }) => l.slug === 'algebra');
      expect(algebra.subject.slug).toBe('math');
      expect(algebra.problemCount).toBeGreaterThan(0);
      expect(algebra.sections).toBeUndefined();

      const lesson = await request(app).get('/api/lessons/kinematics').expect(200);
      expect(lesson.body.data.sections.length).toBeGreaterThan(0);
      expect(lesson.body.data.topic.nameKy).toBe('Кинематика');
      await request(app).get('/api/lessons/nope').expect(404);
    });

    it('pre-renders visible problems and lessons, never drafts', async () => {
      const problem = await prisma.problem.findFirstOrThrow({
        where: { status: 'PUBLISHED', contestProblems: { none: {} } },
        select: { slug: true, titleKy: true },
      });
      const page = await request(seoApp).get(`/problems/${problem.slug}`).expect(200);
      expect(page.headers['content-type']).toContain('text/html');
      expect(page.text).toContain(
        `<link rel="canonical" href="${env.APP_URL.replace(/\/$/, '')}/problems/${problem.slug}" />`,
      );
      expect(page.text).toContain('<h1>');
      expect(page.text).not.toContain('<div id="root"></div>');
      expect(page.text).not.toContain('correctAnswer');

      const topic = await prisma.topic.findFirstOrThrow({ select: { id: true, subjectId: true } });
      await prisma.problem.create({
        data: {
          slug: 'itest-draft-secret',
          status: 'DRAFT',
          subjectId: topic.subjectId,
          topicId: topic.id,
          titleKy: 'Жашыруун <маселе>',
          statementKy: 'ЖАШЫРУУН ШАРТ',
          answerType: 'INTEGER',
          correctAnswer: '1',
          solutionKy: 'x',
          difficulty: 1,
          olympiadLevel: 'SCHOOL',
          gradeFrom: 7,
          gradeTo: 8,
        },
      });
      const hidden = await request(seoApp).get('/problems/itest-draft-secret').expect(404);
      expect(hidden.text).not.toContain('ЖАШЫРУУН');
      expect(hidden.text).toContain('<div id="root"></div>');

      const theory = await request(seoApp).get('/theory').expect(200);
      expect(theory.text).toContain('/theory/algebra');
      const lesson = await request(seoApp).get('/theory/graphs').expect(200);
      expect(lesson.text).toContain('Дейкстра');
      await request(seoApp).get('/theory/nope').expect(404);

      // Without a template the paths fall through to the JSON 404
      await request(app).get('/theory').expect(404);
    });

    it('gives teachers a printable sheet without answers', async () => {
      const klass = await request(app)
        .post('/api/classes')
        .set(auth.teacher!)
        .send({ name: 'Басма класс' })
        .expect(201);
      const problems = await prisma.problem.findMany({
        where: { status: 'PUBLISHED', contestProblems: { none: {} } },
        take: 2,
        orderBy: { slug: 'asc' },
        select: { slug: true },
      });
      const assignment = await request(app)
        .post(`/api/classes/${klass.body.data.id}/assignments`)
        .set(auth.teacher!)
        .send({ titleKy: 'Басма', problemSlugs: problems.map((p) => p.slug) })
        .expect(201);
      const url = `/api/classes/${klass.body.data.id}/assignments/${assignment.body.data.id}/sheet`;

      const sheet = await request(app).get(url).set(auth.teacher!).expect(200);
      expect(sheet.body.data.problems).toHaveLength(2);
      expect(sheet.body.data.problems[0].statementKy).toBeTruthy();
      const json = JSON.stringify(sheet.body);
      expect(json).not.toContain('correctAnswer');
      expect(json).not.toContain('solutionKy');

      await request(app).get(url).set(auth.student!).expect(403);
    });

    it('grants subject and contest achievements', async () => {
      const informatics = await prisma.problem.findMany({
        where: {
          status: 'PUBLISHED',
          subject: { slug: 'informatics' },
          contestProblems: { none: {} },
        },
        take: 10,
        select: { id: true },
      });
      // Pretend the student solved them earlier; the next solve re-checks every metric
      await prisma.problemProgress.createMany({
        data: informatics.map((p) => ({
          userId: ids.student!,
          problemId: p.id,
          status: 'SOLVED' as const,
        })),
      });
      const target = await prisma.problem.findFirstOrThrow({
        where: {
          status: 'PUBLISHED',
          answerType: 'INTEGER',
          contestProblems: { none: {} },
          id: { notIn: informatics.map((p) => p.id) },
        },
        select: { slug: true, correctAnswer: true },
      });
      const res = await request(app)
        .post(`/api/problems/${target.slug}/submit`)
        .set(auth.student!)
        .send({ answer: String(target.correctAnswer) })
        .expect(200);
      const codes = res.body.data.achievements.map((a: { code: string }) => a.code);
      expect(codes).toContain('first-solve');
      expect(codes).toContain('solved-10');
      if (informatics.length >= 10) expect(codes).toContain('informatics-10');

      const now = Date.now();
      const contest = await prisma.contest.create({
        data: {
          titleKy: 'Тест жарышы',
          descriptionKy: 'Тест',
          startsAt: new Date(now - 60_000),
          endsAt: new Date(now + 3_600_000),
          durationMinutes: 30,
          status: 'PUBLISHED',
          isPublic: true,
        },
      });
      try {
        await request(app).post(`/api/contests/${contest.id}/start`).set(auth.student!).expect(200);
        const owned = await prisma.userAchievement.findMany({
          where: { userId: ids.student! },
          select: { achievement: { select: { code: true } } },
        });
        expect(owned.map((o) => o.achievement.code)).toContain('contest-1');
      } finally {
        await prisma.contest.delete({ where: { id: contest.id } });
      }
    });
  },
);
