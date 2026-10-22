import type { MessageKey } from '../i18n/index.js';

export type ErrorCode =
  | 'INTERNAL'
  | 'NOT_FOUND'
  | 'ROUTE_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INVALID_JSON'
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'TOO_MANY_REQUESTS'
  | 'CORS_NOT_ALLOWED'
  | 'EMAIL_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_BLOCKED'
  | 'INVALID_REFRESH_TOKEN'
  | 'INVALID_RESET_TOKEN'
  | 'SCHOOL_NOT_IN_REGION'
  | 'NO_HINT'
  | 'SOLUTION_LOCKED'
  | 'PROFILE_PRIVATE';

/** Error with a stable code; the message is translated by errorHandler via req.lang. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    public readonly params: Record<string, string | number> = {},
    public readonly details?: unknown,
  ) {
    super(code);
    this.name = 'AppError';
  }

  get messageKey(): MessageKey {
    return `errors.${this.code}`;
  }

  static notFound(): AppError {
    return new AppError(404, 'NOT_FOUND');
  }
  static unauthorized(): AppError {
    return new AppError(401, 'UNAUTHORIZED');
  }
  static forbidden(): AppError {
    return new AppError(403, 'FORBIDDEN');
  }
}
