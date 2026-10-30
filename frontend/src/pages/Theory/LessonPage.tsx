import { ArrowLeft, ArrowRight, BookOpenCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { MathText } from '../../components/olimp/MathText';
import { ProblemCard } from '../../components/olimp/ProblemCard';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useLanguage } from '../../hooks/useLanguage';
import { ApiError, errorMessage } from '../../services/api';
import { lessonsApi, type Lesson } from '../../services/lessons';
import { problemsApi, type ProblemCard as ProblemCardData } from '../../services/problems';
import { pickName, pickText } from '../../utils/localize';
import './Theory.css';

const PRACTICE_COUNT = 6;

/** Paragraphs split by blank lines; a paragraph of "- " lines is a bullet list. */
function LessonBody({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/);
  return (
    <div className="lesson-body">
      {paragraphs.map((paragraph, index) => {
        const lines = paragraph.split('\n');
        if (lines.every((line) => line.startsWith('- '))) {
          return (
            <ul key={index}>
              {lines.map((line, i) => (
                <li key={i}>
                  <MathText inline>{line.slice(2)}</MathText>
                </li>
              ))}
            </ul>
          );
        }
        return <MathText key={index}>{paragraph}</MathText>;
      })}
    </div>
  );
}

export function LessonPage() {
  const { slug = '' } = useParams();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { status } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [problems, setProblems] = useState<ProblemCardData[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  useDocumentTitle(lesson ? pickText(lesson.titleKy, lesson.titleRu, language).text : null);

  useEffect(() => {
    let cancelled = false;
    lessonsApi
      .get(slug)
      .then((data) => !cancelled && setLesson(data))
      .catch(
        (err: unknown) =>
          !cancelled &&
          setError(
            err instanceof ApiError ? err : new ApiError('UNKNOWN', errorMessage(err), null),
          ),
      );
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const subjectSlug = lesson?.subject.slug;
  useEffect(() => {
    // Wait for the session so solved/attempted marks are right
    if (!subjectSlug || status === 'loading') return;
    let cancelled = false;
    problemsApi
      .list({ subject: subjectSlug, topic: slug, sort: 'difficulty', pageSize: PRACTICE_COUNT })
      .then((page) => !cancelled && setProblems(page.items))
      .catch(() => !cancelled && setProblems([]));
    return () => {
      cancelled = true;
    };
  }, [subjectSlug, slug, status]);

  if (error) {
    return (
      <div className="container page">
        <EmptyState
          as="h1"
          title={error.status === 404 ? t('theory.notFound') : error.message}
          action={<ButtonLink to="/theory">{t('theory.back')}</ButtonLink>}
        />
      </div>
    );
  }
  if (!lesson) {
    return (
      <div className="container page">
        <Skeleton height="2em" width="60%" />
        <Skeleton height={320} radius="16px" />
      </div>
    );
  }

  const allProblemsUrl = `/problems?subject=${lesson.subject.slug}&topic=${lesson.topic.slug}`;

  return (
    <div className="container page lesson">
      <Link to="/theory" className="back-link">
        <ArrowLeft size={18} aria-hidden="true" />
        {t('theory.back')}
      </Link>
      <header className="page-header">
        <p className="lesson__crumbs">
          {pickName(lesson.subject, language)} · {pickName(lesson.topic, language)}
        </p>
        <h1 className="page-header__title">
          {pickText(lesson.titleKy, lesson.titleRu, language).text}
        </h1>
        <p className="page-header__subtitle">
          {pickText(lesson.summaryKy, lesson.summaryRu, language).text}
        </p>
      </header>

      <article className="card lesson__article">
        {lesson.sections.map((section, index) => (
          <section key={index} className="lesson__section">
            <h2 className="lesson__heading">
              {pickText(section.headingKy, section.headingRu, language).text}
            </h2>
            <LessonBody text={pickText(section.bodyKy, section.bodyRu, language).text} />
          </section>
        ))}
      </article>

      <section className="lesson__practice" aria-labelledby="practice-title">
        <h2 id="practice-title" className="theory__subject-title">
          <span className="theory__icon" aria-hidden="true">
            <BookOpenCheck size={20} />
          </span>
          {t('theory.practice')}
        </h2>
        <p className="page-header__subtitle">{t('theory.practiceHint')}</p>
        {!problems && <Skeleton height={160} radius="16px" />}
        {problems && problems.length === 0 && (
          <p className="dashboard__empty">{t('theory.noProblems')}</p>
        )}
        {problems && problems.length > 0 && (
          <ul className="problem-grid lesson__problems">
            {problems.map((problem) => (
              <li key={problem.id}>
                <ProblemCard problem={problem} />
              </li>
            ))}
          </ul>
        )}
        {lesson.problemCount > 0 && (
          <ButtonLink to={allProblemsUrl} variant="secondary">
            {t('theory.allProblems')} ({lesson.problemCount})
            <ArrowRight size={18} aria-hidden="true" />
          </ButtonLink>
        )}
      </section>
    </div>
  );
}
