import { createHash, randomBytes } from 'node:crypto';

/** URL-safe random token (refresh / password reset) */
export function randomToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}

/** Tokens are stored hashed so a database leak doesn't expose sessions */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
