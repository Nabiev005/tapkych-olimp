import type { Language } from '../i18n';

// Mirrors backend/src/config/levels.ts (names are content, not UI strings).
export const LEVELS = [
  { level: 1, minPoints: 0, nameKy: 'Башталгыч', nameRu: 'Начинающий' },
  { level: 2, minPoints: 100, nameKy: 'Мектеп чемпиону', nameRu: 'Чемпион школы' },
  { level: 3, minPoints: 300, nameKy: 'Райондук деңгээл', nameRu: 'Районный уровень' },
  { level: 4, minPoints: 700, nameKy: 'Облустук деңгээл', nameRu: 'Областной уровень' },
  { level: 5, minPoints: 1500, nameKy: 'Республикалык деңгээл', nameRu: 'Республиканский уровень' },
  { level: 6, minPoints: 3000, nameKy: 'Эл аралык деңгээл', nameRu: 'Международный уровень' },
  { level: 7, minPoints: 6000, nameKy: 'Тапкыч', nameRu: 'Тапкыч' },
] as const;

export function levelName(level: number, lang: Language): string {
  const found = LEVELS.find((l) => l.level === level) ?? LEVELS[0];
  return lang === 'ru' ? found.nameRu : found.nameKy;
}
