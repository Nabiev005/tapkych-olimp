import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { LogoMark } from '../../components/layout/Logo';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useLanguage } from '../../hooks/useLanguage';
import { errorMessage } from '../../services/api';
import { contestsApi, type ContestResults } from '../../services/contests';
import { formatDate } from '../../utils/format';
import { pickText } from '../../utils/localize';
import '../Classes/Print.css';
import './Certificate.css';

const DEGREES = ['I', 'II', 'III'] as const;

/** Printable certificate for the signed-in participant of a finished contest. */
export function CertificatePage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();
  useDocumentTitle(t('contests.certificate.pageTitle'));
  const [data, setData] = useState<ContestResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    contestsApi
      .results(id)
      .then((d) => !cancelled && setData(d))
      .catch((err: unknown) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const row = data?.rows.find((r) => r.user.id === user?.id);
  let problem: string | null = error;
  if (data && data.contest.phase !== 'finished') problem = t('contests.certificate.notReady');
  else if (data && !row) problem = t('contests.certificate.notParticipant');

  const contestTitle = data
    ? pickText(data.contest.titleKy, data.contest.titleRu, language).text
    : '';
  const degree = row && row.rank <= 3 ? DEGREES[row.rank - 1] : null;

  return (
    <div className="container page certificate-page">
      <div className="print-toolbar no-print">
        <Link to={`/contests/${id}/results`} className="back-link">
          <ArrowLeft size={18} aria-hidden="true" />
          {t('contests.results')}
        </Link>
        <p className="print-toolbar__hint">{t('contests.certificate.hint')}</p>
        <Button onClick={() => window.print()} disabled={!row || Boolean(problem)}>
          <Printer size={18} aria-hidden="true" />
          {t('contests.certificate.print')}
        </Button>
      </div>

      {problem && <Alert tone="info">{problem}</Alert>}
      {!data && !error && <Skeleton height={420} radius="12px" />}

      {data && row && !problem && (
        <article className={`certificate${degree ? ' certificate--winner' : ''}`}>
          <div className="certificate__frame">
            <div className="certificate__brand">
              <LogoMark size={56} />
              <span>
                <strong>Тапкыч</strong> Олимп
              </span>
            </div>
            <h1 className="certificate__title">
              {degree ? t('contests.certificate.diploma') : t('contests.certificate.participation')}
            </h1>
            {degree && (
              <p className="certificate__degree">{t('contests.certificate.degree', { degree })}</p>
            )}
            <p className="certificate__awarded">{t('contests.certificate.awardedTo')}</p>
            <p className="certificate__name">{row.user.fullName ?? user?.fullName}</p>
            <p className="certificate__reason">
              {degree
                ? t('contests.certificate.forWinner', { contest: contestTitle, rank: row.rank })
                : t('contests.certificate.forParticipant', { contest: contestTitle })}
            </p>
            <p className="certificate__stats">
              {t('contests.certificate.stats', {
                score: row.score,
                rank: row.rank,
                total: data.rows.length,
              })}
            </p>
            <div className="certificate__footer">
              <span>
                {t('contests.certificate.date')}: {formatDate(data.contest.endsAt, language)}
              </span>
              <span>{t('contests.certificate.issuer')}</span>
              <span>olimp.tapkych.com</span>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
