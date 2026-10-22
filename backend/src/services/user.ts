import type { Prisma } from '@prisma/client';
import { getLevelProgress } from '../config/levels.js';
import { permissionsForRole } from '../config/permissions.js';
import { prisma } from '../db.js';
import { AppError } from '../utils/errors.js';
import { dateColumnToDay, effectiveStreak } from './streak.js';
import type { UpdateMeInput } from '../validators/auth.js';

// Never select passwordHash: this is the only shape of the own user sent to clients.
export const meSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  language: true,
  grade: true,
  schoolId: true,
  customSchoolName: true,
  regionId: true,
  totalPoints: true,
  level: true,
  currentStreak: true,
  longestStreak: true,
  lastActiveDate: true,
  avatarUrl: true,
  isProfilePublic: true,
  emailVerified: true,
  createdAt: true,
  school: { select: { id: true, nameKy: true, nameRu: true } },
  region: { select: { id: true, nameKy: true, nameRu: true } },
} satisfies Prisma.UserSelect;

type MeRow = Prisma.UserGetPayload<{ select: typeof meSelect }>;

export function toMeDto(user: MeRow) {
  const progress = getLevelProgress(user.totalPoints);
  return {
    ...user,
    // A streak is broken once a full Bishkek day passes without a solve
    currentStreak: effectiveStreak(user.currentStreak, dateColumnToDay(user.lastActiveDate)),
    permissions: permissionsForRole(user.role),
    levelProgress: {
      progress: progress.progress,
      pointsToNext: progress.pointsToNext,
      nextLevel: progress.next?.level ?? null,
    },
  };
}
export type MeDto = ReturnType<typeof toMeDto>;

export async function getMe(userId: string): Promise<MeDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ...meSelect, isActive: true },
  });
  if (!user) throw AppError.unauthorized();
  if (!user.isActive) throw new AppError(403, 'ACCOUNT_BLOCKED');
  const { isActive: _isActive, ...me } = user;
  return toMeDto(me);
}

/** Ensures the school (if any) belongs to the region. */
export async function assertSchoolInRegion(
  schoolId: string | null | undefined,
  regionId: string | null | undefined,
): Promise<void> {
  if (!schoolId) return;
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school || (regionId && school.regionId !== regionId)) {
    throw new AppError(400, 'SCHOOL_NOT_IN_REGION');
  }
}

export async function updateMe(userId: string, input: UpdateMeInput): Promise<MeDto> {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, regionId: true, schoolId: true },
  });
  if (!current) throw AppError.unauthorized();

  const regionId = input.regionId ?? current.regionId;
  const schoolId = input.schoolId === undefined ? current.schoolId : input.schoolId;
  if (input.regionId !== undefined || input.schoolId !== undefined) {
    // A region change without a new school drops the old school
    const effectiveSchool = input.regionId && input.schoolId === undefined ? null : schoolId;
    await assertSchoolInRegion(effectiveSchool, regionId);
  }

  const data: Prisma.UserUpdateInput = {
    fullName: input.fullName,
    language: input.language,
    isProfilePublic: input.isProfilePublic,
    // Only students have a grade
    grade: current.role === 'STUDENT' ? input.grade : undefined,
    customSchoolName: input.customSchoolName,
  };
  if (input.regionId !== undefined) {
    data.region = { connect: { id: input.regionId } };
    if (input.schoolId === undefined) data.school = { disconnect: true };
  }
  if (input.schoolId !== undefined) {
    data.school = input.schoolId ? { connect: { id: input.schoolId } } : { disconnect: true };
    if (input.schoolId) data.customSchoolName = null;
  }

  const user = await prisma.user.update({ where: { id: userId }, data, select: meSelect });
  return toMeDto(user);
}
