import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SolvedBarChart } from '../../components/olimp/StatsCharts';
import { Alert } from '../../components/ui/Alert';
import { Skeleton } from '../../components/ui/Skeleton';
import { useLanguage } from '../../hooks/useLanguage';
import { adminApi, type AdminStats } from '../../services/admin';
import { errorMessage } from '../../services/api';
import { formatNumber } from '../../utils/format';
import { pickText } from '../../utils/localize';

const KY_MONTHS_SHORT = [
  'янв',
  'фев',
  'мар',
  'апр',
  'май',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

/** "2026-10-27" → "27 окт" (same short month names in ky and ru) */
function shortDay(day: string): string {
  return `${Number(day.slice(8, 10))} ${KY_MONTHS_SHORT[Number(day.slice(5, 7)) - 1]}`;
}

function StatTile({ label, value, to }: { label: string; value: number; to?: string }) {
  const { language } = useLanguage();
  const body = (
    <>
      <span className="stat-tile__value">{formatNumber(value, language)}</span>
      <span className="stat-tile__label">{label}</span>
    </>
  );
  return to ? (
    <Link to={to} className="card stat-tile stat-tile--link">
      {body}
    </Link>
  ) : (
    <div className="card stat-tile">{body}</div>
  );
}

export function AdminOverview() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .stats()
      .then((s) => !cancelled && setStats(s))
      .catch((err: unknown) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!stats) return <Skeleton height={240} radius="16px" />;

  return (
    <div className="admin-overview">
      <div className="stat-grid">
        <StatTile label={t('admin.stats.users')} value={stats.users.total} to="/admin/users" />
        <StatTile label={t('admin.stats.students')} value={stats.users.byRole.STUDENT ?? 0} />
        <StatTile label={t('admin.stats.teachers')} value={stats.users.byRole.TEACHER ?? 0} />
        <StatTile label={t('admin.stats.newThisWeek')} value={stats.users.newThisWeek} />
        <StatTile
          label={t('admin.stats.published')}
          value={stats.problems.PUBLISHED ?? 0}
          to="/admin/problems"
        />
        <StatTile label={t('admin.stats.drafts')} value={stats.problems.DRAFT ?? 0} />
        <StatTile
          label={t('admin.stats.proposals')}
          value={stats.pendingProposals}
          to="/admin/proposals"
        />
        <StatTile label={t('admin.stats.contests')} value={stats.contests} to="/contests" />
      </div>

      <section className="card admin-section">
        <SolvedBarChart
          title={t('admin.stats.activityTitle')}
          height={220}
          data={stats.activity.map((d) => ({ label: shortDay(d.day), value: d.submissions }))}
          formatValue={(count) => t('admin.stats.submissionsCount', { count })}
        />
        <p className="admin-note">
          {t('admin.stats.activeUsersToday', {
            count: stats.activity.at(-1)?.activeUsers ?? 0,
          })}
        </p>
      </section>

      <div className="admin-two">
        <section className="card admin-section">
          <h2 className="section-title">{t('admin.stats.topSolved')}</h2>
          <ol className="admin-rank">
            {stats.topSolved.map((p) => (
              <li key={p.id}>
                <Link to={`/problems/${p.slug}`}>
                  {pickText(p.titleKy, p.titleRu, language).text}
                </Link>
                <span>{t('admin.stats.solvedBy', { count: p.solvedCount })}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="card admin-section">
          <h2 className="section-title">{t('admin.stats.hardest')}</h2>
          {stats.hardest.length === 0 ? (
            <p className="dashboard__empty">{t('admin.stats.notEnoughData')}</p>
          ) : (
            <ol className="admin-rank">
              {stats.hardest.map((p) => (
                <li key={p.id}>
                  <Link to={`/problems/${p.slug}`}>
                    {pickText(p.titleKy, p.titleRu, language).text}
                  </Link>
                  <span>
                    {t('classes.stats.solvedBy', { percent: p.solvedPercent })} ·{' '}
                    {t('admin.stats.triedBy', { count: p.attemptCount })}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
