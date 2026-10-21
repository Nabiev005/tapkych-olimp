import type { Lang } from '../i18n/index.js';

declare global {
  namespace Express {
    interface Request {
      /** Resolved by middleware/language.ts */
      lang: Lang;
    }
  }
}

export {};
