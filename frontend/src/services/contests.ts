import { getData, postData } from './api';
import type { AnswerType, Choice, SlugRef } from './problems';

export type ContestPhase = 'upcoming' | 'live' | 'finished';

export interface ContestSummary {
  id: string;
  titleKy: string;
  titleRu: string | null;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  showVerdicts: boolean;
  subject: SlugRef | null;
  class: { id: string; name: string } | null;
  phase: ContestPhase;
  participantCount: number;
  problemCount: number;
}

export interface ContestListItem extends ContestSummary {
  registered: boolean;
}

export interface ParticipantState {
  registered: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  deadline: string | null;
  active: boolean;
}

export interface ContestProblem {
  id: string;
  slug: string | null;
  titleKy: string;
  titleRu: string | null;
  statementKy: string;
  statementRu: string | null;
  answerType: AnswerType;
  choices: Choice[] | null;
  difficulty: number;
  points: number;
  order: number;
  myAnswer: string | null;
  attempts: number;
  solved: boolean | null;
}

export interface ContestDetail extends ContestSummary {
  descriptionKy: string;
  descriptionRu: string | null;
  serverTime: string;
  canManage: boolean;
  me: ParticipantState & { score: number | null; penalty: number | null };
  problems: ContestProblem[];
}

export interface ContestResults {
  contest: ContestSummary;
  problems: { id: string; titleKy: string; titleRu: string | null; points: number }[];
  rows: {
    rank: number;
    score: number;
    penalty: number;
    user: {
      id: string;
      fullName: string | null;
      isPublic: boolean;
      school: { nameKy: string; nameRu: string } | null;
    };
    problems: { solved: boolean; attempts: number }[];
  }[];
}

export interface CreateContestPayload {
  titleKy: string;
  titleRu: string | null;
  descriptionKy: string;
  descriptionRu: string | null;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  classId: string | null;
  showVerdicts: boolean;
  problems: { slug: string; points: number }[];
}

const path = (id: string) => `/contests/${encodeURIComponent(id)}`;

export const contestsApi = {
  list: () => getData<ContestListItem[]>('/contests'),
  get: (id: string) => getData<ContestDetail>(path(id)),
  create: (payload: CreateContestPayload) => postData<{ id: string }>('/contests', payload),
  register: (id: string) => postData<{ registered: true }>(`${path(id)}/register`),
  start: (id: string) => postData<ParticipantState>(`${path(id)}/start`),
  submit: (id: string, problemId: string, answer: string) =>
    postData<{ saved: true; isCorrect: boolean | null; score: number | null }>(
      `${path(id)}/submit`,
      {
        problemId,
        answer,
      },
    ),
  finish: (id: string) => postData<{ finished: true }>(`${path(id)}/finish`),
  results: (id: string) => getData<ContestResults>(`${path(id)}/results`),
};
