import type { Role } from '../config/permissions.js';
import type { Lang } from '../i18n/index.js';

declare global {
  namespace Express {
    interface Request {
      /** Resolved by middleware/language.ts */
      lang: Lang;
      /** Set by middleware/auth.ts */
      user?: { id: string; role: Role };
    }
  }
}

export {};
