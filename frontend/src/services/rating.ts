import { getData } from './api';
import type { MyAssignment } from './classes';
import type { Page, ProblemCard } from './problems';
import type { Role } from './types';

export type Period = 'all' | 'month' | 'week';

interface NameKyRu {
  nameKy: string;
  nameRu: string;
}

export interface LeaderboardRow {
  rank: number;
  points: number;
  user: {
    id: string;
    fullName: string | null;
    isPublic: boolean;
    grade: number | null;
    level: number;
    school: NameKyRu | null;
    region: NameKyRu | null;
  };
}

export interface Leaderboard extends Page<LeaderboardRow> {
  period: Period;
  me: { rank: number; points: number } | null;
}

export interface SchoolRow {
  rank: number;
  points: number;
  students: number;
  school: { id: string; nameKy: string; nameRu: string; region: NameKyRu };
}

export interface ProfileAchievement {
  code: string;
  nameKy: string;
  nameRu: string;
  descriptionKy: string;
  descriptionRu: string;
  icon: string;
  unlockedAt: string | null;
}

export interface PublicProfile {
  id: string;
  fullName: string;
  role: Role;
  grade: number | null;
  avatarUrl: string | null;
  school: NameKyRu | null;
  region: NameKyRu | null;
  isProfilePublic: boolean;
  isOwner: boolean;
  memberSince: string;
  totalPoints: number;
  level: number;
  levelProgress: { progress: number; pointsToNext: number; nextLevel: number | null };
  currentStreak: number;
  longestStreak: number;
  rank: number | null;
  totalSolved: number;
  solvedBySubject: (NameKyRu & { slug: string; count: number })[];
  solvedByDifficulty: { difficulty: number; count: number }[];
  activity: { from: string; to: string; days: { day: string; count: number }[] };
  achievements: ProfileAchievement[];
}

export interface DailyProblem {
  date: string;
  bonus: number;
  problem: ProblemCard;
}

export interface UpcomingContest {
  id: string;
  titleKy: string;
  titleRu: string | null;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
}

export interface Dashboard {
  daily: DailyProblem | null;
  continue: ProblemCard[];
  upcomingContests: UpcomingContest[];
  assignments: MyAssignment[];
}

export interface LeaderboardFilters {
  period?: Period;
  regionId?: string;
  schoolId?: string;
  grade?: string;
  page?: number;
  pageSize?: number;
}

const clean = (o: object) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined));

export const ratingApi = {
  leaderboard: (filters: LeaderboardFilters) =>
    getData<Leaderboard>('/leaderboard', clean(filters)),
  schools: (filters: { regionId?: string; page?: number; pageSize?: number }) =>
    getData<Page<SchoolRow>>('/leaderboard/schools', clean(filters)),
  profile: (id: string) => getData<PublicProfile>(`/users/${encodeURIComponent(id)}`),
  daily: () => getData<DailyProblem | null>('/daily'),
  dashboard: () => getData<Dashboard>('/me/dashboard'),
};
