import type { NextFunction, Request, Response } from 'express';
import { DEFAULT_LANG, isLang, type Lang } from '../i18n/index.js';

/** Picks the first supported language from an Accept-Language header. */
export function parseAcceptLanguage(header: string | undefined): Lang | undefined {
  if (!header) return undefined;
  const candidates = header
    .split(',')
    .map((part) => {
      const [tag = '', ...rest] = part.trim().split(';');
      const q = rest.find((p) => p.trim().startsWith('q='));
      return { base: tag.toLowerCase().split('-')[0], q: q ? Number(q.split('=')[1]) : 1 };
    })
    .filter((c) => !Number.isNaN(c.q))
    .sort((a, b) => b.q - a.q);
  return candidates.map((c) => c.base).find(isLang);
}

/** Resolves req.lang: ?lang= query → Accept-Language → default (ky). */
export function language(req: Request, _res: Response, next: NextFunction): void {
  const queryLang = req.query.lang;
  req.lang = isLang(queryLang)
    ? queryLang
    : (parseAcceptLanguage(req.headers['accept-language']) ?? DEFAULT_LANG);
  next();
}
