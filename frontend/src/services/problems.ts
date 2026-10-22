import { getData, postData } from './api';
import type { NamedRef } from './types';

export type AnswerType = 'INTEGER' | 'DECIMAL' | 'TEXT' | 'MULTIPLE_CHOICE';
export type OlympiadLevel = 'SCHOOL' | 'DISTRICT' | 'REGION' | 'NATIONAL' | 'INTERNATIONAL';
export type UserProblemStatus = 'SOLVED' | 'ATTEMPTED' | null;

export const OLYMPIAD_LEVELS: OlympiadLevel[] = [
  'SCHOOL',
  'DISTRICT',
  'REGION',
  'NATIONAL',
  'INTERNATIONAL',
];

export interface SlugRef {
  slug: string;
  nameKy: string;
  nameRu: string;
}

export interface Subject extends SlugRef {
  icon: string;
  topics: SlugRef[];
}

export interface ProblemCard {
  id: string;
  slug: string;
  titleKy: string;
  titleRu: string | null;
  difficulty: number;
  olympiadLevel: OlympiadLevel;
  gradeFrom: number;
  gradeTo: number;
  points: number;
  maxPoints: number;
  solvedCount: number;
  attemptCount: number;
  solvedPercent: number | null;
  publishedAt: string | null;
  subject: SlugRef;
  topic: SlugRef;
  userStatus: UserProblemStatus;
}

export interface Choice {
  id: string;
  textKy: string;
  textRu: string | null;
}

export interface LocalizedText {
  ky: string;
  ru: string | null;
}

export interface SubmissionRow {
  id: string;
  answer: string;
  isCorrect: boolean;
  pointsAwarded: number;
  createdAt: string;
}

export interface ProblemDetail extends ProblemCard {
  statementKy: string;
  statementRu: string | null;
  answerType: AnswerType;
  choices: Choice[] | null;
  source: string | null;
  hasHint: boolean;
  hint: LocalizedText | null;
  solution: LocalizedText | null;
  canOpenSolution: boolean;
  solutionUnlockAttempts: number;
  progress: {
    status: 'SOLVED' | 'ATTEMPTED';
    attempts: number;
    hintOpened: boolean;
    solutionOpened: boolean;
    pointsEarned: number;
    solvedAt: string | null;
  } | null;
  submissions: SubmissionRow[];
  similar: ProblemCard[];
}

export interface UnlockedAchievement {
  code: string;
  nameKy: string;
  nameRu: string;
  descriptionKy: string;
  descriptionRu: string;
  icon: string;
}

export interface SubmitResult {
  isCorrect: boolean;
  pointsAwarded: number;
  alreadySolved: boolean;
  dailyBonus: number;
  attempts: number;
  canOpenSolution: boolean;
  totalPoints: number;
  level: number;
  leveledUp: boolean;
  currentStreak: number;
  achievements: UnlockedAchievement[];
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProblemFilters {
  subject?: string;
  topic?: string;
  difficulty?: string;
  level?: string;
  grade?: string;
  status?: string;
  q?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export const problemsApi = {
  subjects: () => getData<Subject[]>('/subjects'),
  list: (filters: ProblemFilters) =>
    getData<Page<ProblemCard>>('/problems', filters as Record<string, unknown>),
  get: (slug: string) => getData<ProblemDetail>(`/problems/${encodeURIComponent(slug)}`),
  submit: (slug: string, answer: string) =>
    postData<SubmitResult>(`/problems/${encodeURIComponent(slug)}/submit`, { answer }),
  openHint: (slug: string) =>
    postData<{ hint: LocalizedText }>(`/problems/${encodeURIComponent(slug)}/hint`),
  openSolution: (slug: string) =>
    postData<{ solution: LocalizedText }>(`/problems/${encodeURIComponent(slug)}/solution`),
};

export type { NamedRef };
