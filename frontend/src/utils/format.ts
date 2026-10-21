import type { Language } from '../i18n';

// Kyrgyz month names: Intl support for "ky" is inconsistent across browsers, so we keep our own.
const KY_MONTHS = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
] as const;

const APP_TIME_ZONE = 'Asia/Bishkek';

function bishkekParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

/** "21-октябрь, 2026-ж." / "21 октября 2026 г." */
export function formatDate(input: Date | string, lang: Language): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (lang === 'ru') {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: APP_TIME_ZONE,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }
  const { year, month, day } = bishkekParts(date);
  return `${day}-${KY_MONTHS[month - 1]}, ${year}-ж.`;
}

/** Date with time in Bishkek: "21-октябрь, 2026-ж., 10:00" */
export function formatDateTime(input: Date | string, lang: Language): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const { hour, minute } = bishkekParts(date);
  const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return `${formatDate(date, lang)}, ${time}`;
}

/** Numbers with a space as thousands separator in both languages: 12 345 */
export function formatNumber(value: number, lang: Language): string {
  return new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'ky-KG').format(value);
}
