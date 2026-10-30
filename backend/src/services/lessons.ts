import { LESSONS, type Lesson } from '../content/lessons.js';
import { prisma } from '../db.js';
import { AppError } from '../utils/errors.js';
import { visibleProblemWhere } from './problemQueries.js';

interface LessonMeta {
  subject: { slug: string; nameKy: string; nameRu: string };
  topic: { slug: string; nameKy: string; nameRu: string };
  problemCount: number;
}

/** Subject/topic names and the number of catalog problems for each lesson. */
async function lessonMeta(lessons: Lesson[]): Promise<Map<string, LessonMeta>> {
  const topics = await prisma.topic.findMany({
    where: {
      OR: lessons.map((l) => ({ slug: l.slug, subject: { slug: l.subjectSlug } })),
    },
    select: {
      id: true,
      slug: true,
      nameKy: true,
      nameRu: true,
      subject: { select: { slug: true, nameKy: true, nameRu: true } },
    },
  });
  const counts = await prisma.problem.groupBy({
    by: ['topicId'],
    where: { AND: [visibleProblemWhere(), { topicId: { in: topics.map((t) => t.id) } }] },
    _count: { _all: true },
  });
  const countByTopic = new Map(counts.map((c) => [c.topicId, c._count._all]));
  return new Map(
    topics.map((t) => [
      `${t.subject.slug}/${t.slug}`,
      {
        subject: t.subject,
        topic: { slug: t.slug, nameKy: t.nameKy, nameRu: t.nameRu },
        problemCount: countByTopic.get(t.id) ?? 0,
      },
    ]),
  );
}

/** Lessons whose topic exists in the database, in content order. */
export async function listLessons() {
  const meta = await lessonMeta(LESSONS);
  return LESSONS.flatMap((lesson) => {
    const m = meta.get(`${lesson.subjectSlug}/${lesson.slug}`);
    if (!m) return [];
    const { sections: _sections, ...rest } = lesson;
    return [{ ...rest, ...m }];
  });
}

export async function getLesson(slug: string) {
  const lesson = LESSONS.find((l) => l.slug === slug);
  if (!lesson) throw AppError.notFound();
  const m = (await lessonMeta([lesson])).get(`${lesson.subjectSlug}/${lesson.slug}`);
  if (!m) throw AppError.notFound();
  return { ...lesson, ...m };
}
