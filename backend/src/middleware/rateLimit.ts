import rateLimit from 'express-rate-limit';
import { t } from '../i18n/index.js';
import { sendError } from '../utils/response.js';

function createLimiter(windowMs: number, limit: number) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
      sendError(res, 429, 'TOO_MANY_REQUESTS', t(req.lang ?? 'ky', 'errors.TOO_MANY_REQUESTS'));
    },
  });
}

/** General limit for the whole API */
export const apiLimiter = createLimiter(60 * 1000, 300);

/** Strict limit for register / login / password reset */
export const authLimiter = createLimiter(15 * 60 * 1000, 20);
