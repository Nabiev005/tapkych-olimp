import { describe, expect, it } from 'vitest';
import { generateJoinCode } from '../src/services/classes.js';
import { slugify, uniqueSlug } from '../src/utils/slug.js';

describe('slugify', () => {
  it('transliterates Kyrgyz and Russian letters', () => {
    expect(slugify('Үч бурчтуктун аянты')).toBe('uch-burchtuktun-ayanty');
    expect(slugify('Теңдеме, өрнөк!')).toBe('tengdeme-ornok');
    expect(slugify('Задача №5: Ёлка')).toBe('zadacha-5-yolka');
  });
  it('adds a random suffix for uniqueness', () => {
    expect(uniqueSlug('Тест')).toMatch(/^test-[0-9a-f]{6}$/);
    expect(uniqueSlug('???')).toMatch(/^problem-[0-9a-f]{6}$/);
  });
});

describe('generateJoinCode', () => {
  it('produces 6 unambiguous characters', () => {
    for (let i = 0; i < 200; i++) expect(generateJoinCode()).toMatch(/^[A-HJ-KM-NP-Z2-9]{6}$/);
  });
});
