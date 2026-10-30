import { ArrowRight, Atom, Cpu, Sigma, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Skeleton } from '../../components/ui/Skeleton';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useLanguage } from '../../hooks/useLanguage';
import { errorMessage } from '../../services/api';
import { lessonsApi, type LessonSummary } from '../../services/lessons';
import { pickName, pickText } from '../../utils/localize';
import './Theory.css';

const SUBJECT_ICONS: Record<string, LucideIcon> = { math: Sigma, physics: Atom, informatics: Cpu };

export function TheoryPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  useDocumentTitle(t('theory.title'));
  const [lessons, setLessons] = useState<LessonSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    lessonsApi
      .list()
      .then((data) => !cancelled && setLessons(data))
      .catch((err: unknown) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, []);

  // Group by subject, keeping content order
  const groups: { subject: LessonSummary['subject']; items: LessonSummary[] }[] = [];
  for (const lesson of lessons ?? []) {
    const group = groups.find((g) => g.subject.slug === lesson.subject.slug);
    if (group) group.items.push(lesson);
    else groups.push({ subject: lesson.subject, items: [lesson] });
  }

  return (
    <div className="container page theory">
      <header className="page-header">
        <h1 className="page-header__title">{t('theory.title')}</h1>
        <p className="page-header__subtitle">{t('theory.subtitle')}</p>
      </header>

      {error && <Alert tone="error">{error}</Alert>}
      {!lessons && !error && (
        <div className="lesson-grid">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={140} radius="16px" />
          ))}
        </div>
      )}

      {groups.map(({ subject, items }) => {
        const Icon = SUBJECT_ICONS[subject.slug] ?? Sigma;
        return (
          <section
            key={subject.slug}
            className="theory__subject"
            aria-labelledby={`subject-${subject.slug}`}
          >
            <h2 id={`subject-${subject.slug}`} className="theory__subject-title">
              <span className={`theory__icon theory__icon--${subject.slug}`} aria-hidden="true">
                <Icon size={20} />
              </span>
              {pickName(subject, language)}
            </h2>
            <ul className="lesson-grid">
              {items.map((lesson) => (
                <li key={lesson.slug}>
                  <Link to={`/theory/${lesson.slug}`} className="card lesson-card">
                    <h3 className="lesson-card__title">
                      {pickText(lesson.titleKy, lesson.titleRu, language).text}
                    </h3>
                    <p className="lesson-card__summary">
                      {pickText(lesson.summaryKy, lesson.summaryRu, language).text}
                    </p>
                    <span className="lesson-card__footer">
                      <span>{t('theory.problemCount', { count: lesson.problemCount })}</span>
                      <span className="lesson-card__read">
                        {t('theory.read')}
                        <ArrowRight size={16} aria-hidden="true" />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
