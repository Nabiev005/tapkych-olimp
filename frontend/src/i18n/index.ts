import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { readStorage, STORAGE_KEYS } from '../utils/storage';
import ky from './locales/ky.json';
import ru from './locales/ru.json';

export const SUPPORTED_LANGUAGES = ['ky', 'ru'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'ky';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

// The browser language is intentionally ignored: Kyrgyz is the default until the user picks.
const stored = readStorage(STORAGE_KEYS.language);
const initialLanguage: Language = isLanguage(stored) ? stored : DEFAULT_LANGUAGE;

void i18n.use(initReactI18next).init({
  resources: { ky: { translation: ky }, ru: { translation: ru } },
  lng: initialLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: { escapeValue: false },
  returnNull: false,
});

document.documentElement.lang = initialLanguage;
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;
