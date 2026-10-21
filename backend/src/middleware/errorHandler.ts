import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { isProduction } from '../config/env.js';
import { t } from '../i18n/index.js';
import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import { translateZodError } from '../utils/zodMessages.js';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'ROUTE_NOT_FOUND'));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const lang = req.lang ?? 'ky';

  if (err instanceof AppError) {
    sendError(res, err.status, err.code, t(lang, err.messageKey, err.params), err.details);
    return;
  }

  if (err instanceof ZodError) {
    const input = { ...req.params, ...(req.query as object), ...(req.body as object) };
    sendError(res, 400, 'VALIDATION_ERROR', t(lang, 'errors.VALIDATION_ERROR'), {
      fields: translateZodError(err, lang, input),
    });
    return;
  }

  // Malformed JSON body from express.json()
  if (err instanceof SyntaxError && 'body' in err) {
    sendError(res, 400, 'INVALID_JSON', t(lang, 'errors.INVALID_JSON'));
    return;
  }

  console.error(err);
  const details = !isProduction && err instanceof Error ? { stack: err.stack } : undefined;
  sendError(res, 500, 'INTERNAL', t(lang, 'errors.INTERNAL'), details);
}
