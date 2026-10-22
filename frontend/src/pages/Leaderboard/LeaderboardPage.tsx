import { Crown, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { LeaderboardTable } from '../../components/olimp/LeaderboardTable';
import { Alert } from '../../components/ui/Alert';
import { EmptyState } from '../../components/ui/EmptyState';
import { SelectField } from '../../components/ui/Field';
import { Pagination } from '../../components/ui/Pagination';
import { Skeleton } from '../../components/ui/Skeleton';
import { Tabs } from '../../components/ui/Tabs';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { errorMessage } from '../../services/api';
import { geoApi } from '../../services/auth';
import type { Page } from '../../services/problems';
import { ratingApi, type Leaderboard, type Period, type SchoolRow } from '../../services/rating';
import type { Region, School } from '../../services/types';
import { formatNumber } from '../../utils/format';
import { pickName } from '../../utils/localize';
import './LeaderboardPage.css';

type View = 'students' | 'schools';
const PAGE_SIZE = 25;

export function LeaderboardPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user, status: authStatus } = useAuth();
  const [params, setParams] = useSearchParams();

  const view: View = params.get('view') === 'schools' ? 'schools' : 'students';
  const period = (
    ['month', 'week'].includes(params.get('period') ?? '') ? params.get('period') : 'all'
  ) as Period;
  const regionId = params.get('region') ?? '';
  const schoolId = params.get('school') ?? '';
  const grade = params.get('grade') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [regions, setRegions] = useState<Region[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<Leaderboard | null>(null);
  const [schoolBoard, setSchoolBoard] = useState<Page<SchoolRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    geoApi
      .regions()
      .then(setRegions)
      .catch(() => setRegions([]));
  }, []);

  useEffect(() => {
    if (!regionId) return;
    let cancelled = false;
    geoApi
      .schools(regionId, '')
      .then((rows) => !cancelled && setSchools(rows))
      .catch(() => !cancelled && setSchools([]));
    return () => {
      cancelled = true;
    };
  }, [regionId]);

  const key = params.toString();
  useEffect(() => {
    if (authStatus === 'loading') return;
    let cancelled = false;
    const request =
      view === 'students'
        ? ratingApi
            .leaderboard({ period, regionId, schoolId, grade, page, pageSize: PAGE_SIZE })
            .then((data) => !cancelled && setStudents(data))
        : ratingApi
            .schools({ regionId, page, pageSize: PAGE_SIZE })
            .then((data) => !cancelled && setSchoolBoard(data));
    request
      .then(() => !cancelled && setError(null))
      .catch((err: unknown) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // `key` covers every URL filter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, authStatus]);

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in changes)) next.delete('page');
    setLoading(true);
    setParams(next);
  };

  const all = t('leaderboard.filters.all');
  const board = view === 'students' ? students : schoolBoard;

  return (
    <div className="container page">
      <header className="page-header">
        <h1 className="page-header__title">{t('leaderboard.title')}</h1>
        <p className="page-header__subtitle">{t('leaderboard.subtitle')}</p>
      </header>

      <div className="leaderboard-controls">
        <Tabs
          label={t('leaderboard.viewLabel')}
          value={view}
          onChange={(v) =>
            update({ view: v === 'students' ? '' : v, period: '', school: '', grade: '' })
          }
          options={[
            { value: 'students', label: t('leaderboard.views.students') },
            { value: 'schools', label: t('leaderboard.views.schools') },
          ]}
        />
        {view === 'students' && (
          <Tabs
            label={t('leaderboard.periodLabel')}
            value={period}
            onChange={(p) => update({ period: p === 'all' ? '' : p })}
            options={[
              { value: 'all', label: t('leaderboard.periods.all') },
              { value: 'month', label: t('leaderboard.periods.month') },
              { value: 'week', label: t('leaderboard.periods.week') },
            ]}
          />
        )}
      </div>

      <div className="leaderboard-filters card">
        <SelectField
          label={t('leaderboard.filters.region')}
          value={regionId}
          onChange={(e) => update({ region: e.target.value, school: '' })}
          options={[
            { value: '', label: t('leaderboard.filters.country') },
            ...regions.map((r) => ({ value: r.id, label: pickName(r, language) })),
          ]}
        />
        {view === 'students' && (
          <>
            <SelectField
              label={t('leaderboard.filters.school')}
              value={schoolId}
              disabled={!regionId}
              onChange={(e) => update({ school: e.target.value })}
              options={[
                { value: '', label: all },
                ...(regionId ? schools : []).map((s) => ({
                  value: s.id,
                  label: pickName(s, language),
                })),
              ]}
            />
            <SelectField
              label={t('leaderboard.filters.grade')}
              value={grade}
              onChange={(e) => update({ grade: e.target.value })}
              options={[
                { value: '', label: all },
                ...[7, 8, 9, 10, 11].map((g) => ({
                  value: String(g),
                  label: t('auth.fields.gradeOption', { grade: g }),
                })),
              ]}
            />
          </>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {loading && !board ? (
        <div
          className="card leaderboard-skeleton"
          aria-busy="true"
          aria-label={t('common.loading')}
        >
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} height="2.2em" />
          ))}
        </div>
      ) : board && board.items.length === 0 ? (
        <EmptyState
          icon={<Trophy size={28} />}
          title={t('leaderboard.empty.title')}
          description={t('leaderboard.empty.description')}
        />
      ) : view === 'students' && students ? (
        <div aria-busy={loading}>
          <LeaderboardTable rows={students.items} currentUserId={user?.id} me={students.me} />
          <Pagination
            page={students.page}
            totalPages={students.totalPages}
            onChange={(p) => update({ page: p > 1 ? String(p) : '' })}
          />
        </div>
      ) : view === 'schools' && schoolBoard ? (
        <div aria-busy={loading}>
          <div className="table-wrap">
            <table className="leaderboard">
              <thead>
                <tr>
                  <th scope="col" className="leaderboard__rank">
                    {t('leaderboard.columns.rank')}
                  </th>
                  <th scope="col">{t('leaderboard.columns.schoolName')}</th>
                  <th scope="col" className="leaderboard__school">
                    {t('leaderboard.columns.students')}
                  </th>
                  <th scope="col" className="leaderboard__points">
                    {t('leaderboard.columns.points')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {schoolBoard.items.map((row) => (
                  <tr
                    key={row.school.id}
                    className={row.school.id === user?.schoolId ? 'is-me' : undefined}
                  >
                    <td className="leaderboard__rank">
                      <span
                        className={`rank${row.rank <= 3 ? ` rank--top rank--${row.rank}` : ''}`}
                      >
                        {row.rank <= 3 && <Crown size={14} aria-hidden="true" />}
                        {row.rank}
                      </span>
                    </td>
                    <td>
                      <div className="leaderboard__user">
                        <span className="leaderboard__name">{pickName(row.school, language)}</span>
                        <span className="leaderboard__region">
                          {pickName(row.school.region, language)}
                        </span>
                      </div>
                    </td>
                    <td className="leaderboard__school">{formatNumber(row.students, language)}</td>
                    <td className="leaderboard__points">{formatNumber(row.points, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={schoolBoard.page}
            totalPages={schoolBoard.totalPages}
            onChange={(p) => update({ page: p > 1 ? String(p) : '' })}
          />
        </div>
      ) : null}
    </div>
  );
}
