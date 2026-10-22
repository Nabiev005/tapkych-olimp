import type { CookieOptions, Request, Response } from 'express';
import { isProduction } from '../config/env.js';
import { currentUser } from '../middleware/auth.js';
import * as authService from '../services/auth.js';
import { sendData } from '../utils/response.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../validators/auth.js';

export const REFRESH_COOKIE = 'olimp_rt';

const cookieBase: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/api/auth',
};

function readRefreshCookie(req: Request): string | undefined {
  const value: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' ? value : undefined;
}

function sendSession(res: Response, session: authService.Session, status = 200): void {
  res.cookie(REFRESH_COOKIE, session.refreshToken, {
    ...cookieBase,
    expires: session.refreshExpiresAt,
  });
  sendData(res, { accessToken: session.accessToken, user: session.user }, status);
}

export async function register(req: Request, res: Response): Promise<void> {
  const input = registerSchema.parse(req.body);
  sendSession(res, await authService.register(input, req.lang, req.get('user-agent')), 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);
  sendSession(res, await authService.login(input, req.get('user-agent')));
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    sendSession(res, await authService.refresh(readRefreshCookie(req), req.get('user-agent')));
  } catch (error) {
    res.clearCookie(REFRESH_COOKIE, cookieBase);
    throw error;
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(readRefreshCookie(req));
  res.clearCookie(REFRESH_COOKIE, cookieBase);
  sendData(res, { ok: true });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = forgotPasswordSchema.parse(req.body);
  await authService.forgotPassword(email);
  sendData(res, { ok: true });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  await authService.changePassword(
    currentUser(req).id,
    currentPassword,
    newPassword,
    readRefreshCookie(req),
  );
  sendData(res, { ok: true });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = resetPasswordSchema.parse(req.body);
  await authService.resetPassword(token, password);
  sendData(res, { ok: true });
}
