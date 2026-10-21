import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { isLanguage, type Language } from '../i18n';
import { STORAGE_KEYS, writeStorage } from '../utils/storage';

/**
 * Current UI language and a setter. Guests: saved in localStorage.
 * Signed-in users will also get User.language updated (stage 2).
 */
export function useLanguage() {
  const { i18n } = useTranslation();
  const language: Language = isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'ky';

  const setLanguage = useCallback(
    (next: Language) => {
      writeStorage(STORAGE_KEYS.language, next);
      void i18n.changeLanguage(next);
    },
    [i18n],
  );

  return { language, setLanguage };
}
