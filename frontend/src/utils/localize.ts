import type { Language } from '../i18n';

export interface Localized {
  text: string;
  /** Russian was requested but only Kyrgyz exists */
  missing: boolean;
}

/** Kyrgyz is required, Russian optional: fall back to Kyrgyz and flag it. */
export function pickText(ky: string, ru: string | null | undefined, lang: Language): Localized {
  if (lang === 'ru') {
    return ru?.trim() ? { text: ru, missing: false } : { text: ky, missing: true };
  }
  return { text: ky, missing: false };
}

/** For bilingual reference data (subjects, topics, regions): name in the UI language */
export function pickName(item: { nameKy: string; nameRu: string }, lang: Language): string {
  return lang === 'ru' ? item.nameRu || item.nameKy : item.nameKy;
}
