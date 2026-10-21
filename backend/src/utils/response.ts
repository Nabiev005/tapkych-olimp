import type { Response } from 'express';

// Unified response shapes: { data } on success, { error: { code, message } } on failure.

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export function sendData<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ data });
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  const body: ApiErrorBody = { error: { code, message } };
  if (details !== undefined) body.error.details = details;
  res.status(status).json(body);
}
