import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { cleanupUsers, ensureGeo, hasTestDb, refreshCookie, testEmail } from './helpers.js';

describe.skipIf(!hasTestDb)('change password (integration)', () => {
  const app = createApp();

  afterAll(async () => {
    await cleanupUsers();
    await prisma.$disconnect();
  });

  it('requires the current password, keeps this session and ends the others', async () => {
    const geo = await ensureGeo();
    const email = testEmail('pw');
    const reg = await request(app).post('/api/auth/register').send({
      fullName: 'Пароль Алмаштыруучу',
      email,
      password: 'oldsecret1',
      role: 'TEACHER',
      regionId: geo.region.id,
      schoolId: geo.school.id,
    });
    const auth = { Authorization: `Bearer ${reg.body.data.accessToken}` };
    const thisSession = refreshCookie(reg.headers['set-cookie'])!;
    const other = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'oldsecret1' });
    const otherSession = refreshCookie(other.headers['set-cookie'])!;

    const wrong = await request(app)
      .post('/api/auth/change-password')
      .set(auth)
      .send({ currentPassword: 'nope', newPassword: 'newsecret1' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe('WRONG_PASSWORD');

    expect(
      (
        await request(app)
          .post('/api/auth/change-password')
          .send({ currentPassword: 'x', newPassword: 'newsecret1' })
      ).status,
    ).toBe(401);

    const ok = await request(app)
      .post('/api/auth/change-password')
      .set(auth)
      .set('Cookie', thisSession)
      .send({ currentPassword: 'oldsecret1', newPassword: 'newsecret1' });
    expect(ok.status).toBe(200);

    expect((await request(app).post('/api/auth/refresh').set('Cookie', thisSession)).status).toBe(
      200,
    );
    expect((await request(app).post('/api/auth/refresh').set('Cookie', otherSession)).status).toBe(
      401,
    );
    expect(
      (await request(app).post('/api/auth/login').send({ email, password: 'newsecret1' })).status,
    ).toBe(200);
  });
});
