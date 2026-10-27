import { api, getData, patchData, postData, type ApiSuccess } from './api';
import type { ProblemPayload } from './classes';
import type { AnswerType, OlympiadLevel, Page, ProblemCard, SlugRef } from './problems';
import type { Role } from './types';

export type ProblemStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface AdminProblemRow {
  id: string;
  slug: string;
  titleKy: string;
  titleRu: string | null;
  status: ProblemStatus;
  difficulty: number;
  olympiadLevel: OlympiadLevel;
  solvedCount: number;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
  reviewNote: string | null;
  subject: SlugRef;
  topic: SlugRef;
  author: { id: string; fullName: string; role: Role } | null;
}

export interface AdminProblem extends AdminProblemRow {
  statementKy: string;
  statementRu: string | null;
  answerType: AnswerType;
  correctAnswer: string | string[];
  tolerance: number | null;
  choices: { id: string; textKy: string; textRu: string | null }[] | null;
  solutionKy: string;
  solutionRu: string | null;
  hintKy: string | null;
  hintRu: string | null;
  gradeFrom: number;
  gradeTo: number;
  points: number;
  source: string | null;
}

export interface AdminStats {
  users: { total: number; byRole: Partial<Record<Role, number>>; newThisWeek: number };
  problems: Partial<Record<ProblemStatus, number>>;
  pendingProposals: number;
  contests: number;
  activity: { day: string; submissions: number; activeUsers: number; solved: number }[];
  topSolved: ProblemCard[];
  hardest: {
    id: string;
    slug: string;
    titleKy: string;
    titleRu: string | null;
    solvedPercent: number;
    attemptCount: number;
  }[];
}

export interface ImportReport {
  dryRun: boolean;
  created: number;
  updated: number;
  invalid: number;
  results: {
    index: number;
    slug: string | null;
    titleKy: string | null;
    action: 'created' | 'updated' | 'invalid';
    errors?: { path: string; message: string }[];
  }[];
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  grade: number | null;
  isActive: boolean;
  totalPoints: number;
  createdAt: string;
  school: { nameKy: string; nameRu: string } | null;
  region: { nameKy: string; nameRu: string } | null;
}

export interface TaxonomySubject {
  id: string;
  slug: string;
  nameKy: string;
  nameRu: string;
  icon: string;
  order: number;
  topics: {
    id: string;
    slug: string;
    nameKy: string;
    nameRu: string;
    order: number;
    _count: { problems: number };
  }[];
}

export interface DailyEntry {
  date: string;
  isAuto: boolean;
  problem: { slug: string; titleKy: string; titleRu: string | null; difficulty: number };
}

export type ProblemMeta = { slug?: string; status: ProblemStatus };

const clean = (o: object) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined));

export const adminApi = {
  stats: () => getData<AdminStats>('/admin/stats'),
  problems: (filters: {
    status?: string;
    subject?: string;
    q?: string;
    proposals?: boolean;
    page?: number;
  }) =>
    getData<Page<AdminProblemRow>>(
      '/admin/problems',
      clean({ ...filters, proposals: filters.proposals ? 'true' : undefined }),
    ),
  problem: (id: string) => getData<AdminProblem>(`/admin/problems/${encodeURIComponent(id)}`),
  createProblem: (payload: ProblemPayload & ProblemMeta) =>
    postData<{ id: string; slug: string }>('/admin/problems', payload),
  updateProblem: async (id: string, payload: ProblemPayload & ProblemMeta) =>
    (
      await api.put<ApiSuccess<{ id: string; slug: string }>>(
        `/admin/problems/${encodeURIComponent(id)}`,
        payload,
      )
    ).data.data,
  setStatus: (id: string, status: ProblemStatus, reviewNote?: string | null) =>
    postData<{ status: ProblemStatus }>(`/admin/problems/${encodeURIComponent(id)}/status`, {
      status,
      reviewNote,
    }),
  checkAnswer: (body: {
    answerType: AnswerType;
    correctAnswer: string | string[];
    tolerance: number | null;
    answer: string;
  }) => postData<{ isCorrect: boolean }>('/admin/problems/check-answer', body),
  importProblems: (problems: unknown[], dryRun: boolean) =>
    postData<ImportReport>('/admin/problems/import', { problems, dryRun }),
  users: (filters: { q?: string; role?: string; page?: number }) =>
    getData<Page<AdminUser>>('/admin/users', clean(filters)),
  updateUser: (id: string, body: { role?: Role; isActive?: boolean }) =>
    patchData<{ id: string; role: Role; isActive: boolean }>(
      `/admin/users/${encodeURIComponent(id)}`,
      body,
    ),
  taxonomy: () => getData<TaxonomySubject[]>('/admin/taxonomy'),
  createSubject: (body: {
    slug: string;
    nameKy: string;
    nameRu: string;
    icon: string;
    order: number;
  }) => postData<{ id: string }>('/admin/subjects', body),
  createTopic: (body: {
    subjectSlug: string;
    slug: string;
    nameKy: string;
    nameRu: string;
    order: number;
  }) => postData<{ id: string }>('/admin/topics', body),
  createSchool: (body: {
    regionId: string;
    nameKy: string;
    nameRu: string;
    district: string | null;
  }) => postData<{ id: string }>('/admin/schools', body),
  daily: () => getData<{ today: string; items: DailyEntry[] }>('/admin/daily'),
  setDaily: async (date: string, problemSlug: string) =>
    (await api.put<ApiSuccess<{ date: string }>>('/admin/daily', { date, problemSlug })).data.data,
};
