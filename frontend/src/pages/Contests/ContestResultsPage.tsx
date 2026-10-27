import { ArrowLeft, CheckCircle2, Crown, Minus, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { ApiError, errorMessage } from '../../services/api';
import { contestsApi, type ContestResults } from '../../services/contests';
import { pickName, pickText } from '../../utils/localize';
import '../Classes/Classes.css';
import './Contests.css';

export function ContestResultsPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user, status } = useAuth();
  const [data, setData] = useState<ContestResults | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    let cancelled = false;
    contestsApi
      .results(id)
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
  }, [id, status]);

  if (error) {
    return (
      <div className="container page">
        <EmptyState
          as="h1"
          title={error.status === 404 ? t('contests.notFound') : error.message}
          action={<ButtonLink to={`/contests/${id}`}>{t('contests.backToContest')}</ButtonLink>}
        />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="container page">
        <Skeleton height={240} radius="16px" />
      </div>
    );
  }

  return (
    <div className="container page class-page">
      <Link to={`/contests/${id}`} className="back-link">
        <ArrowLeft size={18} aria-hidden="true" />
        {pickText(data.contest.titleKy, data.contest.titleRu, language).text}
      </Link>
      <h1 className="page-header__title">{t('contests.results')}</h1>

      {data.rows.length === 0 ? (
        <p className="dashboard__empty">{t('contests.noParticipants')}</p>
      ) : (
        <div className="table-wrap">
          <table className="results-table">
            <caption className="visually-hidden">{t('contests.results')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('leaderboard.columns.rank')}</th>
                <th scope="col">{t('contests.participant')}</th>
                {data.problems.map((p, i) => (
                  <th key={p.id} scope="col" title={pickText(p.titleKy, p.titleRu, language).text}>
                    {i + 1}
                  </th>
                ))}
                <th scope="col">{t('contests.score')}</th>
                {data.contest.showVerdicts && <th scope="col">{t('contests.penalty')}</th>}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.user.id} className={row.user.id === user?.id ? 'is-me' : undefined}>
                  <td>
                    <span className={`rank${row.rank <= 3 ? ` rank--top rank--${row.rank}` : ''}`}>
                      {row.rank <= 3 && <Crown size={14} aria-hidden="true" />}
                      {row.rank}
                    </span>
                  </td>
                  <th scope="row">
                    {row.user.fullName && row.user.isPublic ? (
                      <Link to={`/u/${row.user.id}`}>{row.user.fullName}</Link>
                    ) : (
                      <span className="leaderboard__name is-anon">
                        {row.user.fullName ?? t('leaderboard.anonymous')}
                      </span>
                    )}
                    {row.user.school && (
                      <span className="leaderboard__region">
                        {pickName(row.user.school, language)}
                      </span>
                    )}
                  </th>
                  {row.problems.map((p, i) => (
                    <td key={i}>
                      {p.solved ? (
                        <span className="result result--solved" title={t('classes.results.solved')}>
                          <CheckCircle2 size={18} aria-hidden="true" />
                          <span className="visually-hidden">{t('classes.results.solved')}</span>
                        </span>
                      ) : p.attempts > 0 ? (
                        <span className="result result--attempted" title={t('contests.notSolved')}>
                          <XCircle size={18} aria-hidden="true" />
                          <span className="visually-hidden">{t('contests.notSolved')}</span>
                        </span>
                      ) : (
                        <span className="result" title={t('classes.results.none')}>
                          <Minus size={18} aria-hidden="true" />
                          <span className="visually-hidden">{t('classes.results.none')}</span>
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="results-table__total">{row.score}</td>
                  {data.contest.showVerdicts && <td>{row.penalty}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
