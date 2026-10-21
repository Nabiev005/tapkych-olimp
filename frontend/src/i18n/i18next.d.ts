import 'i18next';
import type ky from './locales/ky.json';

// Type-safe translation keys: t('common.nav.home') is checked at compile time.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof ky };
    returnNull: false;
  }
}
