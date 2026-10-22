import bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import { prisma } from '../db.js';
import { t, type Lang } from '../i18n/index.js';
import { randomToken, sha256 } from '../utils/crypto.js';
import { AppError } from '../utils/errors.js';
import { signAccessToken } from '../utils/jwt.js';
import type { LoginInput, RegisterInput } from '../validators/auth.js';
import { sendEmail } from './email.js';
import { assertSchoolInRegion, meSelect, toMeDto, type MeDto } from './user.js';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
/** A just-rotated refresh token may be replayed by a parallel tab; don't treat that as theft */
const REUSE_GRACE_MS = 10 * 1000;

export interface Session {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: MeDto;
}

async function issueSession(user: MeDto, userAgent?: string): Promise<Session> {
  const refreshToken = randomToken();
  const refreshExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(refreshToken),
      userAgent: userAgent?.slice(0, 255),
      expiresAt: refreshExpiresAt,
    },
  });
  return {
    accessToken: signAccessToken({ sub: user.id, role: user.role }),
    refreshToken,
    refreshExpiresAt,
    user,
  };
}

export async function register(
  input: RegisterInput,
  lang: Lang,
  userAgent?: string,
): Promise<Session> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError(409, 'EMAIL_TAKEN');
  await assertSchoolInRegion(input.schoolId, input.regionId);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, env.BCRYPT_ROUNDS),
      fullName: input.fullName,
      role: input.role,
      grade: input.role === 'STUDENT' ? (input.grade ?? null) : null,
      regionId: input.regionId,
      schoolId: input.schoolId ?? null,
      customSchoolName: input.schoolId ? null : (input.customSchoolName ?? null),
      language: input.language ?? lang,
    },
    select: meSelect,
  });
  return issueSession(toMeDto(user), userAgent);
}

export async function login(input: LoginInput, userAgent?: string): Promise<Session> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...meSelect, passwordHash: true, isActive: true },
  });
  // Same error for unknown email and wrong password (no account enumeration)
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS');
  }
  if (!user.isActive) throw new AppError(403, 'ACCOUNT_BLOCKED');
  const { passwordHash: _hash, isActive: _active, ...me } = user;
  return issueSession(toMeDto(me), userAgent);
}

/** Rotates the refresh token: the old one is revoked, a new pair is issued. */
export async function refresh(
  refreshToken: string | undefined,
  userAgent?: string,
): Promise<Session> {
  if (!refreshToken) throw new AppError(401, 'INVALID_REFRESH_TOKEN');
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(refreshToken) },
    include: { user: { select: { ...meSelect, isActive: true } } },
  });
  if (!stored) throw new AppError(401, 'INVALID_REFRESH_TOKEN');

  if (stored.revokedAt) {
    // Reuse of a rotated token outside the grace window → possible theft: end all sessions
    if (Date.now() - stored.revokedAt.getTime() > REUSE_GRACE_MS) {
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    throw new AppError(401, 'INVALID_REFRESH_TOKEN');
  }
  if (stored.expiresAt.getTime() < Date.now()) throw new AppError(401, 'INVALID_REFRESH_TOKEN');
  if (!stored.user.isActive) throw new AppError(403, 'ACCOUNT_BLOCKED');

  // Conditional update guards against two concurrent rotations of the same token
  const { count } = await prisma.refreshToken.updateMany({
    where: { id: stored.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) throw new AppError(401, 'INVALID_REFRESH_TOKEN');

  const { isActive: _active, ...me } = stored.user;
  return issueSession(toMeDto(me), userAgent);
}

export async function logout(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Always succeeds from the caller's point of view (no account enumeration). */
export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return;

  const token = randomToken(32);
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });
  const link = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: user.email,
    subject: t(user.language, 'email.resetSubject'),
    text: t(user.language, 'email.resetBody', { name: user.fullName, link }),
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const stored = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: sha256(token) },
  });
  if (!stored || stored.usedAt || stored.expiresAt.getTime() < Date.now()) {
    throw new AppError(400, 'INVALID_RESET_TOKEN');
  }
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
    // Log out everywhere after a password change
    prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}
