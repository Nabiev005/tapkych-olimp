import rateLimit, { type Options } from 'express-rate-limit';
import { t } from '../i18n/index.js';
import { sendError } from '../utils/response.js';

// Factories: every app instance (and every test) gets its own counters.
function createLimiter(windowMs: number, limit: number, extra: Partial<Options> = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
      sendError(res, 429, 'TOO_MANY_REQUESTS', t(req.lang ?? 'ky', 'errors.TOO_MANY_REQUESTS'));
    },
    ...extra,
  });
}

/** General limit for the whole API */
export const createApiLimiter = () => createLimiter(60 * 1000, 300);

/** Strict limit for register / login / password reset */
export const createAuthLimiter = () => createLimiter(15 * 60 * 1000, 20);

/** Answer submissions: 5 per minute per user per problem (7.3 / 8.3) */
export const createSubmitLimiter = () =>
  createLimiter(60 * 1000, 5, {
    keyGenerator: (req) => `${req.user?.id ?? 'guest'}:${String(req.params.slug)}`,
  });
