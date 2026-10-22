import { ArrowLeft, CheckCircle2, Minus, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ProblemCard } from '../../components/olimp/ProblemCard';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useLanguage } from '../../hooks/useLanguage';
import { ApiError, errorMessage } from '../../services/api';
import { classesApi, type AssignmentDetail } from '../../services/classes';
import { formatDateTime } from '../../utils/format';
import { pickText } from '../../utils/localize';
import './Classes.css';

function ResultCell({ status }: { status: 'SOLVED' | 'ATTEMPTED' | null }) {
  const { t } = useTranslation();
  if (status === 'SOLVED') {
    return (
      <span className="result result--solved" title={t('classes.results.solved')}>
        <CheckCircle2 size={18} aria-hidden="true" />
        <span className="visually-hidden">{t('classes.results.solved')}</span>
      </span>
    );
  }
  if (status === 'ATTEMPTED') {
    return (
      <span className="result result--attempted" title={t('classes.results.attempted')}>
        <XCircle size={18} aria-hidden="true" />
        <span className="visually-hidden">{t('classes.results.attempted')}</span>
      </span>
    );
  }
  return (
    <span className="result" title={t('classes.results.none')}>
      <Minus size={18} aria-hidden="true" />
      <span className="visually-hidden">{t('classes.results.none')}</span>
    </span>
  );
}

export function AssignmentPage() {
  const { id = '', assignmentId = '' } = useParams();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [data, setData] = useState<AssignmentDetail | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let cancelled = false;
    classesApi
      .assignment(id, assignmentId)
      .then((d) => !cancelled && setData(d))
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
  }, [id, assignmentId]);

  if (error) {
    return (
      <div className="container page">
        <EmptyState
          as="h1"
          title={error.status === 404 ? t('classes.notFound') : error.message}
          action={<ButtonLink to={`/classes/${id}`}>{t('classes.backToClass')}</ButtonLink>}
        />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="container page">
        <Skeleton height="2em" width="50%" />
        <Skeleton height={240} radius="16px" />
      </div>
    );
  }

  return (
    <div className="container page class-page">
      <Link to={`/classes/${id}`} className="back-link">
        <ArrowLeft size={18} aria-hidden="true" />
        {data.class.name}
      </Link>
      <header>
        <h1 className="page-header__title">
          {pickText(data.titleKy, data.titleRu, language).text}
        </h1>
        {data.dueDate && (
          <p className="page-header__subtitle">
            {t('classes.due', { date: formatDateTime(data.dueDate, language) })}
          </p>
        )}
      </header>

      {data.isTeacher && (
        <section className="classes-section" aria-labelledby="results-title">
          <h2 id="results-title" className="section-title">
            {t('classes.results.title')}
          </h2>
          {data.students.length === 0 ? (
            <p className="dashboard__empty">{t('classes.noMembers')}</p>
          ) : (
            <div className="table-wrap">
              <table className="results-table">
                <caption className="visually-hidden">{t('classes.results.title')}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t('leaderboard.columns.student')}</th>
                    {data.problems.map((p, i) => (
                      <th
                        key={p.id}
                        scope="col"
                        title={pickText(p.titleKy, p.titleRu, language).text}
                      >
                        <Link to={`/problems/${p.slug}`}>{i + 1}</Link>
                      </th>
                    ))}
                    <th scope="col">{t('classes.results.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((s) => (
                    <tr key={s.id}>
                      <th scope="row">
                        <Link to={`/u/${s.id}`}>{s.fullName}</Link>
                      </th>
                      {s.results.map((r, i) => (
                        <td key={i}>
                          <ResultCell status={r} />
                        </td>
                      ))}
                      <td className="results-table__total">
                        {s.solved}/{data.problems.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="results-legend">
            <ResultCell status="SOLVED" /> {t('classes.results.solved')}
            <ResultCell status="ATTEMPTED" /> {t('classes.results.attempted')}
            <ResultCell status={null} /> {t('classes.results.none')}
          </p>
        </section>
      )}

      <section className="classes-section" aria-labelledby="problems-title">
        <h2 id="problems-title" className="section-title">
          {t('classes.results.problems')}
        </h2>
        <ol className="problem-grid">
          {data.problems.map((p) => (
            <li key={p.id}>
              <ProblemCard problem={p} />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
