import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { clearRatingCache } from '../../src/services/rating.js';
import { signAccessToken } from '../../src/utils/jwt.js';
import { bishkekDayAsDate } from '../../src/utils/dateRange.js';
import { cleanupUsers, ensureGeo, hasTestDb, testEmail } from './helpers.js';

describe.skipIf(!hasTestDb)('leaderboard, profiles, daily (integration)', () => {
  let app = createApp();
  beforeEach(() => {
    app = createApp();
    clearRatingCache();
  });

  let geo: Awaited<ReturnType<typeof ensureGeo>>;
  const users: Record<string, { id: string }> = {};
  let problemId = '';
  const auth = (id: string, role: 'STUDENT' | 'TEACHER' = 'STUDENT') => ({
    Authorization: `Bearer ${signAccessToken({ sub: id, role })}`,
  });

  async function makeUser(
    key: string,
    data: {
      totalPoints: number;
      grade?: number;
      role?: 'STUDENT' | 'TEACHER';
      isProfilePublic?: boolean;
    },
  ) {
    users[key] = await prisma.user.create({
      data: {
        email: testEmail(key),
        passwordHash: 'x',
        fullName: `Колдонуучу ${key}`,
        role: data.role ?? 'STUDENT',
        grade: data.grade ?? 8,
        regionId: geo.region.id,
        schoolId: geo.school.id,
        totalPoints: data.totalPoints,
        isProfilePublic: data.isProfilePublic ?? true,
      },
      select: { id: true },
    });
  }

  beforeAll(async () => {
    geo = await ensureGeo();
    await cleanupUsers();
    await makeUser('a', { totalPoints: 300 });
    await makeUser('b', { totalPoints: 200, grade: 9 });
    await makeUser('c', { totalPoints: 200 });
    await makeUser('d', { totalPoints: 50, isProfilePublic: false });
    await makeUser('zero', { totalPoints: 0 });
    await makeUser('teacher', { totalPoints: 999, role: 'TEACHER' });

    const anyProblem = await prisma.problem.findFirstOrThrow({ where: { status: 'PUBLISHED' } });
    problemId = anyProblem.id;
    const now = new Date();
    const longAgo = new Date(now.getTime() - 60 * 86_400_000);
    // This week: d leads with 40, c has 10; a only scored long ago
    await prisma.submission.createMany({
      data: [
        {
          userId: users.d!.id,
          problemId,
          answer: '1',
          isCorrect: true,
          pointsAwarded: 40,
          createdAt: now,
        },
        {
          userId: users.c!.id,
          problemId,
          answer: '1',
          isCorrect: true,
          pointsAwarded: 10,
          createdAt: now,
        },
        {
          userId: users.a!.id,
          problemId,
          answer: '1',
          isCorrect: true,
          pointsAwarded: 300,
          createdAt: longAgo,
        },
      ],
    });
    await prisma.problemProgress.create({
      data: { userId: users.a!.id, problemId, status: 'SOLVED', attempts: 1, solvedAt: now },
    });
  });

  afterAll(async () => {
    await cleanupUsers();
    await prisma.$disconnect();
  });

  const board = (query: Record<string, string | number>, headers: Record<string, string> = {}) =>
    request(app)
      .get('/api/leaderboard')
      .set(headers)
      .query({ regionId: geo.region.id, ...query });

  it('ranks students by total points with shared ranks for ties', async () => {
    const res = await board({});
    expect(res.status).toBe(200);
    const rows = res.body.data.items as { rank: number; points: number; user: { id: string } }[];
    expect(rows.map((r) => [r.user.id, r.rank, r.points])).toEqual([
      [users.a!.id, 1, 300],
      [users.b!.id < users.c!.id ? users.b!.id : users.c!.id, 2, 200],
      [users.b!.id < users.c!.id ? users.c!.id : users.b!.id, 2, 200],
      [users.d!.id, 4, 50],
    ]);
    // teachers and zero-point students are not ranked
    expect(res.body.data.total).toBe(4);
  });

  it('hides names of private profiles but shows them to their owner', async () => {
    const guest = await board({});
    const anon = guest.body.data.items.find(
      (r: { user: { id: string } }) => r.user.id === users.d!.id,
    );
    expect(anon.user.fullName).toBeNull();
    expect(anon.user.school).toBeNull();

    const own = await board({}, auth(users.d!.id));
    const mine = own.body.data.items.find(
      (r: { user: { id: string } }) => r.user.id === users.d!.id,
    );
    expect(mine.user.fullName).toBe('Колдонуучу d');
    expect(JSON.stringify(own.body)).not.toContain('@itest');
  });

  it('always returns the viewer position, even outside the page', async () => {
    const res = await board({ pageSize: 1 }, auth(users.d!.id));
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.me).toEqual({ rank: 4, points: 50 });
    expect((await board({}, auth(users.teacher!.id, 'TEACHER'))).body.data.me).toBeNull();
  });

  it('filters by grade', async () => {
    const res = await board({ grade: 9 });
    expect(res.body.data.items.map((r: { user: { id: string } }) => r.user.id)).toEqual([
      users.b!.id,
    ]);
    expect(res.body.data.items[0].rank).toBe(1);
  });

  it('weekly board counts only points earned this week', async () => {
    const res = await board({ period: 'week' }, auth(users.c!.id));
    const rows = res.body.data.items as { rank: number; points: number; user: { id: string } }[];
    expect(rows.map((r) => [r.user.id, r.rank, r.points])).toEqual([
      [users.d!.id, 1, 40],
      [users.c!.id, 2, 10],
    ]);
    expect(res.body.data.me).toEqual({ rank: 2, points: 10 });
    const month = await board({ period: 'month' });
    expect(month.body.data.items.map((r: { user: { id: string } }) => r.user.id)).not.toContain(
      users.a!.id,
    );
  });

  it('ranks schools by the sum of their students points', async () => {
    const res = await request(app)
      .get('/api/leaderboard/schools')
      .query({ regionId: geo.region.id });
    expect(res.status).toBe(200);
    expect(res.body.data.items[0]).toMatchObject({
      rank: 1,
      points: 750,
      students: 4,
      school: { id: geo.school.id },
    });
  });

  it('public profile has stats and never exposes the email', async () => {
    const res = await request(app).get(`/api/users/${users.a!.id}`);
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('@');
    expect(res.body.data).toMatchObject({
      totalPoints: 300,
      totalSolved: 1,
      rank: 1,
      isOwner: false,
    });
    expect(res.body.data.activity.days).toHaveLength(1);
    expect(res.body.data.solvedByDifficulty).toHaveLength(5);
    expect(res.body.data.achievements.length).toBeGreaterThan(0);
  });

  it('hidden profiles are visible only to the owner', async () => {
    const other = await request(app).get(`/api/users/${users.d!.id}`);
    expect(other.status).toBe(403);
    expect(other.body.error.code).toBe('PROFILE_PRIVATE');
    const owner = await request(app).get(`/api/users/${users.d!.id}`).set(auth(users.d!.id));
    expect(owner.status).toBe(200);
    expect(owner.body.data.isOwner).toBe(true);
    expect((await request(app).get('/api/users/does-not-exist')).status).toBe(404);
  });

  it('picks a daily problem automatically and keeps it for the day', async () => {
    await prisma.dailyProblem.deleteMany({ where: { date: bishkekDayAsDate() } });
    const first = await request(app).get('/api/daily');
    expect(first.status).toBe(200);
    const slug = first.body.data.problem.slug;
    expect(first.body.data.bonus).toBe(10);
    expect(JSON.stringify(first.body)).not.toContain('correctAnswer');
    const second = await request(app).get('/api/daily');
    expect(second.body.data.problem.slug).toBe(slug);
    const stored = await prisma.dailyProblem.findUniqueOrThrow({
      where: { date: bishkekDayAsDate() },
    });
    expect(stored.isAuto).toBe(true);
  });

  it('dashboard lists daily, unfinished problems and upcoming contests', async () => {
    await prisma.problemProgress.create({
      data: { userId: users.b!.id, problemId, status: 'ATTEMPTED', attempts: 1 },
    });
    const res = await request(app).get('/api/me/dashboard').set(auth(users.b!.id));
    expect(res.status).toBe(200);
    expect(res.body.data.continue.map((p: { id: string }) => p.id)).toContain(problemId);
    expect(res.body.data.daily).not.toBeNull();
    expect(Array.isArray(res.body.data.upcomingContests)).toBe(true);
    expect((await request(app).get('/api/me/dashboard')).status).toBe(401);
  });
});
