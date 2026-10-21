import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { t } from '../src/i18n/index.js';
import { ky } from '../src/i18n/ky.js';
import { ru } from '../src/i18n/ru.js';
import { translateZodError } from '../src/utils/zodMessages.js';

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'string' ? [`${prefix}${k}`] : keys(v as object, `${prefix}${k}.`),
  );
}

describe('backend i18n', () => {
  it('ky and ru have identical keys', () => {
    expect(keys(ru).sort()).toEqual(keys(ky).sort());
  });

  it('interpolates params', () => {
    expect(t('ky', 'validation.stringTooShort', { min: 8 })).toBe('Кеминде 8 белги болушу керек.');
    expect(t('ru', 'validation.stringTooShort', { min: 8 })).toBe(
      'Должно быть не менее 8 символов.',
    );
  });

  it('translates Zod issues in both languages', () => {
    const schema = z.object({
      email: z.email(),
      password: z.string().min(8),
      grade: z.number().max(11),
    });
    const input = { email: 'bad', grade: 12 };
    const result = schema.safeParse(input);
    expect(result.success).toBe(false);
    if (result.success) return;

    const kyFields = translateZodError(result.error, 'ky', input);
    expect(kyFields).toEqual([
      { path: 'email', message: 'Email дареги туура эмес.' },
      { path: 'password', message: 'Бул талаа милдеттүү.' },
      { path: 'grade', message: 'Маани 11 же андан кичине болушу керек.' },
    ]);
    const ruFields = translateZodError(result.error, 'ru', input);
    expect(ruFields[1]?.message).toBe('Это поле обязательно.');
  });
});
