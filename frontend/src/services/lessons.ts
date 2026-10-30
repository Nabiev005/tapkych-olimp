import { getData } from './api';

export interface NameRef {
  slug: string;
  nameKy: string;
  nameRu: string;
}

export interface LessonSection {
  headingKy: string;
  headingRu: string;
  bodyKy: string;
  bodyRu: string;
}

export interface LessonSummary {
  slug: string;
  subjectSlug: string;
  titleKy: string;
  titleRu: string;
  summaryKy: string;
  summaryRu: string;
  subject: NameRef;
  topic: NameRef;
  problemCount: number;
}

export interface Lesson extends LessonSummary {
  sections: LessonSection[];
}

export const lessonsApi = {
  list: () => getData<LessonSummary[]>('/lessons'),
  get: (slug: string) => getData<Lesson>(`/lessons/${encodeURIComponent(slug)}`),
};
