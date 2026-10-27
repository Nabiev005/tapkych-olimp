import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { hasTestDb } from './helpers.js';

describe.skipIf(!hasTestDb)('sitemap.xml (integration)', () => {
  afterAll(() => prisma.$disconnect());

  it('lists public pages and visible problems only', async () => {
    const res = await request(createApp()).get('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/xml');
    expect(res.text).toContain('<loc>http://localhost:5173/problems</loc>');
    const visible = await prisma.problem.findFirstOrThrow({
      where: { status: 'PUBLISHED', contestProblems: { none: {} } },
    });
    expect(res.text).toContain(`/problems/${visible.slug}</loc>`);
    // Problems of an upcoming public contest stay out of the sitemap
    expect(res.text).not.toContain('/problems/trailing-zeros-100-factorial<');
    expect(res.text).not.toContain('/admin');
  });
});
