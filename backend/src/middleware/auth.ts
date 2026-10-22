import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors.js';
import { verifyAccessToken } from '../utils/jwt.js';

function bearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
}

/** Requires a valid access token; sets req.user. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = bearerToken(req);
  if (!token) throw AppError.unauthorized();
  const payload = verifyAccessToken(token);
  req.user = { id: payload.sub, role: payload.role };
  next();
}

/** Sets req.user when a valid token is present; never fails. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = bearerToken(req);
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.sub, role: payload.role };
    } catch {
      // expired/invalid token on a public route: treat as guest
    }
  }
  next();
}

/** req.user for handlers behind requireAuth */
export function currentUser(req: Request): {
  id: string;
  role: NonNullable<Request['user']>['role'];
} {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}
