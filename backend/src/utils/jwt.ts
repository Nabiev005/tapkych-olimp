import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { Role } from '../config/permissions.js';
import { AppError } from './errors.js';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

const ROLES: readonly Role[] = ['STUDENT', 'TEACHER', 'ADMIN'];

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
    if (
      typeof decoded === 'object' &&
      typeof decoded.sub === 'string' &&
      ROLES.includes(decoded.role as Role)
    ) {
      return { sub: decoded.sub, role: decoded.role as Role };
    }
    throw AppError.unauthorized();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) throw new AppError(401, 'TOKEN_EXPIRED');
    throw AppError.unauthorized();
  }
}
