import { getData, postData, api } from './api';
import type { AnswerType, OlympiadLevel, ProblemCard, SlugRef } from './problems';

export interface TeachingClass {
  id: string;
  name: string;
  grade: number | null;
  joinCode: string;
  createdAt: string;
  memberCount: number;
  assignmentCount: number;
}

export interface JoinedClass {
  id: string;
  name: string;
  grade: number | null;
  teacherName: string;
  assignmentCount: number;
  joinedAt: string;
}

export interface ClassMemberRow {
  id: string;
  fullName: string;
  grade: number | null;
  totalPoints: number;
  level: number;
  solvedCount: number;
  joinedAt: string;
}

export interface ClassAssignmentRow {
  id: string;
  titleKy: string;
  titleRu: string | null;
  dueDate: string | null;
  createdAt: string;
  problemCount: number;
  completedCount?: number;
  mySolved?: number;
}

export interface ClassDetail {
  id: string;
  name: string;
  grade: number | null;
  teacherName: string;
  createdAt: string;
  isTeacher: boolean;
  joinCode?: string;
  members: ClassMemberRow[];
  assignments: ClassAssignmentRow[];
}

export interface ClassStats {
  memberCount: number;
  problems: {
    problemId: string;
    slug: string;
    titleKy: string;
    titleRu: string | null;
    difficulty: number;
    solved: number;
    attempted: number;
    solvedPercent: number;
  }[];
}

export interface AssignmentDetail {
  id: string;
  titleKy: string;
  titleRu: string | null;
  dueDate: string | null;
  createdAt: string;
  class: { id: string; name: string };
  isTeacher: boolean;
  problems: ProblemCard[];
  students: {
    id: string;
    fullName: string;
    results: ('SOLVED' | 'ATTEMPTED' | null)[];
    solved: number;
  }[];
}

export interface MyAssignment {
  id: string;
  titleKy: string;
  titleRu: string | null;
  dueDate: string | null;
  class: { id: string; name: string };
  problemCount: number;
  solvedCount: number;
}

export interface ProblemPayload {
  subjectSlug: string;
  topicSlug: string;
  titleKy: string;
  titleRu: string | null;
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
  difficulty: number;
  olympiadLevel: OlympiadLevel;
  gradeFrom: number;
  gradeTo: number;
  points: number;
  source: string | null;
}

export interface Proposal {
  id: string;
  slug: string;
  titleKy: string;
  titleRu: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  reviewNote: string | null;
  createdAt: string;
  subject: SlugRef;
}

export const classesApi = {
  list: () => getData<{ teaching: TeachingClass[]; joined: JoinedClass[] }>('/classes'),
  create: (name: string, grade: number | null) =>
    postData<TeachingClass>('/classes', { name, grade }),
  join: (code: string) => postData<{ id: string; name: string }>('/classes/join', { code }),
  get: (id: string) => getData<ClassDetail>(`/classes/${encodeURIComponent(id)}`),
  stats: (id: string) => getData<ClassStats>(`/classes/${encodeURIComponent(id)}/stats`),
  removeMember: (id: string, userId: string) =>
    api.delete(`/classes/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`),
  createAssignment: (
    id: string,
    body: {
      titleKy: string;
      titleRu: string | null;
      dueDate: string | null;
      problemSlugs: string[];
    },
  ) => postData<{ id: string }>(`/classes/${encodeURIComponent(id)}/assignments`, body),
  assignment: (id: string, assignmentId: string) =>
    getData<AssignmentDetail>(
      `/classes/${encodeURIComponent(id)}/assignments/${encodeURIComponent(assignmentId)}`,
    ),
  propose: (payload: ProblemPayload) => postData<{ slug: string }>('/proposals', payload),
  myProposals: () => getData<Proposal[]>('/proposals'),
};
