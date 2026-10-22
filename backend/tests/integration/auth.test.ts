import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { setEmailSender, type EmailMessage } from '../../src/services/email.js';
import { cleanupUsers, ensureGeo, hasTestDb, refreshCookie, testEmail } from './helpers.js';

describe.skipIf(!hasTestDb)('auth API (integration)', () => {
  // Fresh app per test: rate-limit counters don't leak between tests
  let app = createApp();
  beforeEach(() => {
    app = createApp();
  });
  let geo: Awaited<ReturnType<typeof ensureGeo>>;
  const sentEmails: EmailMessage[] = [];

  beforeAll(async () => {
    geo = await ensureGeo();
    setEmailSender({ send: async (m) => void sentEmails.push(m) });
  });

  afterAll(async () => {
    await cleanupUsers();
    await prisma.$disconnect();
  });

  function studentPayload(email: string) {
    return {
      fullName: 'Тест Окуучу',
      email,
      password: 'secret123',
      role: 'STUDENT',
      grade: 8,
      regionId: geo.region.id,
      schoolId: geo.school.id,
    };
  }

  it('registers a student, returns a token and sets an httpOnly refresh cookie', async () => {
    const email = testEmail('reg');
    const res = await request(app)
      .post('/api/auth/register')
      .set('Accept-Language', 'ru')
      .send(studentPayload(email.toUpperCase()));

    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({
      email,
      role: 'STUDENT',
      grade: 8,
      language: 'ru',
      school: { id: geo.school.id },
    });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.permissions).toContain('problems:submit');

    const cookie = (res.headers['set-cookie'] as unknown as string[]).find((c) =>
      c.startsWith('olimp_rt='),
    );
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/api\/auth/);
  });

  it('rejects a duplicate email with a translated error', async () => {
    const email = testEmail('dup');
    await request(app).post('/api/auth/register').send(studentPayload(email));
    const res = await request(app).post('/api/auth/register').send(studentPayload(email));
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: 'EMAIL_TAKEN',
      message: 'Бул email менен катталган колдонуучу бар.',
    });
  });

  it('validates required fields in both languages', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...studentPayload(testEmail('v')), grade: undefined });
    expect(res.status).toBe(400);
    expect(res.body.error.details.fields).toContainEqual({
      path: 'grade',
      message: 'Классыңызды тандаңыз.',
    });

    const ru = await request(app)
      .post('/api/auth/register?lang=ru')
      .send({ email: 'bad', password: '123' });
    expect(ru.status).toBe(400);
    const fields = ru.body.error.details.fields as { path: string; message: string }[];
    expect(fields).toContainEqual({ path: 'email', message: 'Неверный адрес email.' });
    expect(fields).toContainEqual({
      path: 'password',
      message: 'Должно быть не менее 8 символов.',
    });
  });

  it('teachers can register without a grade, with a custom school name', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Тест Мугалим',
        email: testEmail('teacher'),
        password: 'secret123',
        role: 'TEACHER',
        grade: 9,
        regionId: geo.region.id,
        customSchoolName: 'Айылдык мектеп',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({
      role: 'TEACHER',
      grade: null,
      customSchoolName: 'Айылдык мектеп',
    });
    expect(res.body.data.user.permissions).toContain('classes:create');
  });

  it('refuses ADMIN self-registration and schools from another region', async () => {
    const admin = await request(app)
      .post('/api/auth/register')
      .send({ ...studentPayload(testEmail('adm')), role: 'ADMIN' });
    expect(admin.status).toBe(400);

    const school = await request(app)
      .post('/api/auth/register')
      .send({ ...studentPayload(testEmail('sch')), schoolId: geo.otherSchool.id });
    expect(school.status).toBe(400);
    expect(school.body.error.code).toBe('SCHOOL_NOT_IN_REGION');
  });

  it('logs in, and gives the same error for unknown email and wrong password', async () => {
    const email = testEmail('login');
    await request(app).post('/api/auth/register').send(studentPayload(email));

    const wrong = await request(app).post('/api/auth/login').send({ email, password: 'nope1234' });
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail('ghost'), password: 'nope1234' });
    expect(wrong.status).toBe(401);
    expect(unknown.body.error).toEqual(wrong.body.error);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');

    const ok = await request(app).post('/api/auth/login').send({ email, password: 'secret123' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.user.email).toBe(email);
  });

  it('GET/PATCH /api/me require a token and update the profile', async () => {
    expect((await request(app).get('/api/me')).status).toBe(401);
    expect(
      (await request(app).get('/api/me').set('Authorization', 'Bearer not-a-token')).status,
    ).toBe(401);

    const reg = await request(app)
      .post('/api/auth/register')
      .send(studentPayload(testEmail('me')));
    const auth = { Authorization: `Bearer ${reg.body.data.accessToken}` };

    const me = await request(app).get('/api/me').set(auth);
    expect(me.status).toBe(200);
    expect(me.body.data.passwordHash).toBeUndefined();
    expect(me.body.data.levelProgress).toMatchObject({ nextLevel: 2, pointsToNext: 100 });

    const patched = await request(app)
      .patch('/api/me')
      .set(auth)
      .send({ language: 'ru', isProfilePublic: false });
    expect(patched.status).toBe(200);
    expect(patched.body.data).toMatchObject({ language: 'ru', isProfilePublic: false });

    const forbiddenField = await request(app).patch('/api/me').set(auth).send({ role: 'ADMIN' });
    expect(forbiddenField.status).toBe(400);
  });

  it('rotates refresh tokens and rejects the old one; logout ends the session', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send(studentPayload(testEmail('rt')));
    const first = refreshCookie(reg.headers['set-cookie']);
    expect(first).toBeDefined();

    const refreshed = await request(app).post('/api/auth/refresh').set('Cookie', first!);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toEqual(expect.any(String));
    const second = refreshCookie(refreshed.headers['set-cookie']);
    expect(second).not.toEqual(first);

    const reused = await request(app).post('/api/auth/refresh').set('Cookie', first!);
    expect(reused.status).toBe(401);
    expect(reused.body.error.code).toBe('INVALID_REFRESH_TOKEN');

    await request(app).post('/api/auth/logout').set('Cookie', second!);
    const afterLogout = await request(app).post('/api/auth/refresh').set('Cookie', second!);
    expect(afterLogout.status).toBe(401);

    expect((await request(app).post('/api/auth/refresh')).status).toBe(401);
  });

  it('resets the password via an emailed link and logs out other sessions', async () => {
    const email = testEmail('reset');
    const reg = await request(app).post('/api/auth/register').send(studentPayload(email));
    const oldCookie = refreshCookie(reg.headers['set-cookie'])!;

    const unknown = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testEmail('nobody') });
    expect(unknown.status).toBe(200);

    sentEmails.length = 0;
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email });
    expect(forgot.status).toBe(200);
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0]!.subject).toContain('паролду калыбына келтирүү');
    const token = new URL(/https?:\/\/\S+/.exec(sentEmails[0]!.text)![0]).searchParams.get(
      'token',
    )!;

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'newsecret1' });
    expect(reset.status).toBe(200);

    const again = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'another12' });
    expect(again.body.error.code).toBe('INVALID_RESET_TOKEN');

    expect(
      (await request(app).post('/api/auth/login').send({ email, password: 'newsecret1' })).status,
    ).toBe(200);
    expect((await request(app).post('/api/auth/refresh').set('Cookie', oldCookie)).status).toBe(
      401,
    );
  });

  it('blocked users cannot log in', async () => {
    const email = testEmail('blocked');
    await request(app).post('/api/auth/register').send(studentPayload(email));
    await prisma.user.update({ where: { email }, data: { isActive: false } });
    const res = await request(app).post('/api/auth/login').send({ email, password: 'secret123' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_BLOCKED');
  });

  it('lists regions and searches schools', async () => {
    const regions = await request(app).get('/api/regions');
    expect(regions.status).toBe(200);
    expect(regions.body.data.some((r: { id: string }) => r.id === geo.region.id)).toBe(true);

    const schools = await request(app)
      .get('/api/schools')
      .query({ regionId: geo.region.id, q: 'тест' });
    expect(schools.body.data.map((s: { id: string }) => s.id)).toEqual(['itest-school']);
  });
});
