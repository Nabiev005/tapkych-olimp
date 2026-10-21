import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { parseAcceptLanguage } from '../src/middleware/language.js';

const app = createApp();

describe('language detection', () => {
  it('parses Accept-Language with weights', () => {
    expect(parseAcceptLanguage('ru-RU,ru;q=0.9,en;q=0.8')).toBe('ru');
    expect(parseAcceptLanguage('en-US,ky;q=0.5,ru;q=0.4')).toBe('ky');
    expect(parseAcceptLanguage('en-US,en;q=0.9')).toBeUndefined();
    expect(parseAcceptLanguage(undefined)).toBeUndefined();
  });
});

describe('API basics', () => {
  it('GET /api/health returns { data }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.lang).toBe('ky');
  });

  it('defaults to Kyrgyz even for English browsers', async () => {
    const res = await request(app).get('/api/health').set('Accept-Language', 'en-US');
    expect(res.body.data.lang).toBe('ky');
  });

  it('returns translated errors in the unified format', async () => {
    const ky = await request(app).get('/api/nope');
    expect(ky.status).toBe(404);
    expect(ky.body.error).toEqual({ code: 'ROUTE_NOT_FOUND', message: 'Мындай API дареги жок.' });

    const ru = await request(app).get('/api/nope?lang=ru');
    expect(ru.body.error.message).toBe('Такого адреса API не существует.');

    const header = await request(app).get('/api/nope').set('Accept-Language', 'ru');
    expect(header.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(header.body.error.message).toBe('Такого адреса API не существует.');
  });

  it('rejects malformed JSON with INVALID_JSON', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{bad json');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('sets security headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
