import type { MessageKey } from '../i18n/index.js';

export type ErrorCode =
  | 'INTERNAL'
  | 'NOT_FOUND'
  | 'ROUTE_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INVALID_JSON'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TOO_MANY_REQUESTS'
  | 'CORS_NOT_ALLOWED';

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
