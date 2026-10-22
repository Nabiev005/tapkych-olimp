// Shapes returned by the backend API.

export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';
export type Language = 'ky' | 'ru';

export interface NamedRef {
  id: string;
  nameKy: string;
  nameRu: string;
}

export interface Region extends NamedRef {
  slug: string;
}

export interface School extends NamedRef {
  regionId: string;
  district: string | null;
}

export interface Me {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  language: Language;
  grade: number | null;
  schoolId: string | null;
  customSchoolName: string | null;
  regionId: string | null;
  totalPoints: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  avatarUrl: string | null;
  isProfilePublic: boolean;
  emailVerified: boolean;
  createdAt: string;
  school: NamedRef | null;
  region: NamedRef | null;
  permissions: string[];
  levelProgress: { progress: number; pointsToNext: number; nextLevel: number | null };
}

/** Picks the name in the UI language (Kyrgyz is the fallback) */
export function localizedName(item: NamedRef, lang: Language): string {
  return lang === 'ru' ? item.nameRu || item.nameKy : item.nameKy;
}
