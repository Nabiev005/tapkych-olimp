import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { language } from '../src/middleware/language.js';
import { requirePermission } from '../src/middleware/requireRole.js';
import { signAccessToken, verifyAccessToken } from '../src/utils/jwt.js';

function appWith(...perm: Parameters<typeof requirePermission>) {
  const app = express();
  app.use(language);
  app.get('/x', ...requirePermission(...perm), (_req, res) => {
    res.json({ data: 'ok' });
  });
  app.use(errorHandler);
  return app;
}

const token = (role: 'STUDENT' | 'TEACHER' | 'ADMIN') =>
  `Bearer ${signAccessToken({ sub: 'u1', role })}`;

describe('requirePermission', () => {
  it('rejects guests with 401', async () => {
    const res = await request(appWith('classes:create')).get('/x');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects roles without the permission with 403 (translated)', async () => {
    const res = await request(appWith('classes:create'))
      .get('/x?lang=ru')
      .set('Authorization', token('STUDENT'));
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('У вас нет прав на это действие.');
  });

  it('lets teachers and admins through', async () => {
    const app = appWith('classes:create');
    expect((await request(app).get('/x').set('Authorization', token('TEACHER'))).status).toBe(200);
    expect((await request(app).get('/x').set('Authorization', token('ADMIN'))).status).toBe(200);
    expect(
      (await request(appWith('problems:publish')).get('/x').set('Authorization', token('TEACHER')))
        .status,
    ).toBe(403);
  });
});

describe('access tokens', () => {
  it('round-trips and rejects tampering', () => {
    const t = signAccessToken({ sub: 'abc', role: 'TEACHER' });
    expect(verifyAccessToken(t)).toEqual({ sub: 'abc', role: 'TEACHER' });
    expect(() => verifyAccessToken(`${t}x`)).toThrow();
  });
});
