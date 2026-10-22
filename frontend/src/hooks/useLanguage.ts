import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { isLanguage, type Language } from '../i18n';
import { STORAGE_KEYS, writeStorage } from '../utils/storage';
import { useAuth } from './useAuth';

/**
 * Current UI language and a setter. Guests: saved in localStorage.
 * Signed-in users: also saved to User.language.
 */
export function useLanguage() {
  const { i18n } = useTranslation();
  const { user, updateMe } = useAuth();
  const language: Language = isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'ky';

  const setLanguage = useCallback(
    (next: Language) => {
      writeStorage(STORAGE_KEYS.language, next);
      void i18n.changeLanguage(next);
      if (user && user.language !== next) {
        // Best effort: the UI already switched even if saving fails
        updateMe({ language: next }).catch(() => {});
      }
    },
    [i18n, user, updateMe],
  );

  return { language, setLanguage };
}
