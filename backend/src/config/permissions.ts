// Roles and permissions. Backend is the source of truth; the frontend only mirrors this list.

export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

const STUDENT_PERMISSIONS = [
  'problems:read',
  'problems:submit',
  'problems:hint',
  'problems:solution',
  'leaderboard:read',
  'profile:update',
  'classes:join',
  'assignments:complete',
  'contests:participate',
] as const;

const TEACHER_PERMISSIONS = [
  'classes:create',
  'classes:manage', // view / remove students in own classes
  'assignments:create',
  'classes:stats',
  'contests:createClass',
  'problems:propose', // creates DRAFT problems for admin review
] as const;

const ADMIN_PERMISSIONS = [
  'problems:create',
  'problems:update',
  'problems:publish',
  'problems:archive',
  'problems:review',
  'problems:import',
  'taxonomy:manage', // subjects & topics
  'schools:manage',
  'regions:manage',
  'users:manage',
  'contests:createPublic',
  'daily:manage',
  'admin:stats',
] as const;

export const ALL_PERMISSIONS = [
  ...STUDENT_PERMISSIONS,
  ...TEACHER_PERMISSIONS,
  ...ADMIN_PERMISSIONS,
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  STUDENT: new Set<Permission>(STUDENT_PERMISSIONS),
  TEACHER: new Set<Permission>([...STUDENT_PERMISSIONS, ...TEACHER_PERMISSIONS]),
  ADMIN: new Set<Permission>(ALL_PERMISSIONS),
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function permissionsForRole(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}
