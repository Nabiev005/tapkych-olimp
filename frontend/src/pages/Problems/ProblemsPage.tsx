import { Search, SearchX, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { ProblemCard } from '../../components/olimp/ProblemCard';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { SelectField } from '../../components/ui/Field';
import { Pagination } from '../../components/ui/Pagination';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { errorMessage } from '../../services/api';
import {
  OLYMPIAD_LEVELS,
  problemsApi,
  type Page,
  type ProblemCard as ProblemCardData,
  type Subject,
} from '../../services/problems';
import { pickName } from '../../utils/localize';
import './ProblemsPage.css';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const FILTER_KEYS = [
  'subject',
  'topic',
  'difficulty',
  'level',
  'grade',
  'status',
  'q',
  'sort',
] as const;
const PAGE_SIZE = 12;

export function ProblemsPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('problems.title'));
  const { language } = useLanguage();
  const { status: authStatus } = useAuth();
  const [params, setParams] = useSearchParams();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [data, setData] = useState<Page<ProblemCardData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(params.get('q') ?? '');

  const filters = useMemo(() => {
    const entries = FILTER_KEYS.map((k) => [k, params.get(k) ?? ''] as const);
    return Object.fromEntries(entries) as Record<(typeof FILTER_KEYS)[number], string>;
  }, [params]);
  const page = Math.max(1, Number(params.get('page')) || 1);
  const paramsKey = params.toString();

  useEffect(() => {
    problemsApi
      .subjects()
      .then(setSubjects)
      .catch(() => setSubjects([]));
  }, []);

  // Refetch whenever the URL filters change (and once auth is resolved, for statuses)
  useEffect(() => {
    if (authStatus === 'loading') return;
    let cancelled = false;
    const query = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    problemsApi
      .list({ ...query, page, pageSize: PAGE_SIZE })
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
    // paramsKey captures all filter changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, authStatus]);

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // Any filter change returns to the first page
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    update({ q: search.trim() });
  };

  const reset = () => {
    setSearch('');
    setParams(new URLSearchParams());
  };

  const topics = subjects.find((s) => s.slug === filters.subject)?.topics ?? [];
  const hasFilters = FILTER_KEYS.some((k) => k !== 'sort' && filters[k]);
  const all = t('problems.filters.all');
  const loading = !data && !error;

  return (
    <div className="container page">
      <header className="page-header">
        <h1 className="page-header__title">{t('problems.title')}</h1>
        <p className="page-header__subtitle">{t('problems.subtitle')}</p>
      </header>

      <section className="filters card" aria-label={t('problems.filters.label')}>
        <form className="filters__search" onSubmit={onSearch} role="search">
          <label className="visually-hidden" htmlFor="problem-search">
            {t('problems.filters.search')}
          </label>
          <Search size={18} aria-hidden="true" className="filters__search-icon" />
          <input
            id="problem-search"
            className="input"
            type="search"
            placeholder={t('problems.filters.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={100}
          />
          <Button type="submit">{t('problems.filters.searchButton')}</Button>
        </form>

        <div className="filters__grid">
          <SelectField
            label={t('problems.filters.subject')}
            value={filters.subject}
            onChange={(e) => update({ subject: e.target.value, topic: '' })}
            options={[
              { value: '', label: all },
              ...subjects.map((s) => ({ value: s.slug, label: pickName(s, language) })),
            ]}
          />
          <SelectField
            label={t('problems.filters.topic')}
            value={filters.topic}
            disabled={!filters.subject}
            onChange={(e) => update({ topic: e.target.value })}
            options={[
              { value: '', label: all },
              ...topics.map((tp) => ({ value: tp.slug, label: pickName(tp, language) })),
            ]}
          />
          <SelectField
            label={t('problems.filters.difficulty')}
            value={filters.difficulty}
            onChange={(e) => update({ difficulty: e.target.value })}
            options={[
              { value: '', label: all },
              ...[1, 2, 3, 4, 5].map((d) => ({
                value: String(d),
                label: t('problems.difficulty.option', { value: d }),
              })),
            ]}
          />
          <SelectField
            label={t('problems.filters.level')}
            value={filters.level}
            onChange={(e) => update({ level: e.target.value })}
            options={[
              { value: '', label: all },
              ...OLYMPIAD_LEVELS.map((l) => ({ value: l, label: t(`problems.levels.${l}`) })),
            ]}
          />
          <SelectField
            label={t('problems.filters.grade')}
            value={filters.grade}
            onChange={(e) => update({ grade: e.target.value })}
            options={[
              { value: '', label: all },
              ...[7, 8, 9, 10, 11].map((g) => ({
                value: String(g),
                label: t('auth.fields.gradeOption', { grade: g }),
              })),
            ]}
          />
          {authStatus === 'authenticated' && (
            <SelectField
              label={t('problems.filters.status')}
              value={filters.status}
              onChange={(e) => update({ status: e.target.value })}
              options={[
                { value: '', label: all },
                { value: 'solved', label: t('problems.status.solved') },
                { value: 'unsolved', label: t('problems.status.unsolved') },
                { value: 'attempted', label: t('problems.status.attempted') },
              ]}
            />
          )}
          <SelectField
            label={t('problems.filters.sort')}
            value={filters.sort || 'new'}
            onChange={(e) => update({ sort: e.target.value === 'new' ? '' : e.target.value })}
            options={[
              { value: 'new', label: t('problems.sort.new') },
              { value: 'difficulty', label: t('problems.sort.difficulty') },
              { value: 'popular', label: t('problems.sort.popular') },
            ]}
          />
        </div>

        {hasFilters && (
          <div className="filters__footer">
            <Button variant="ghost" size="sm" onClick={reset}>
              <X size={16} aria-hidden="true" />
              {t('problems.filters.reset')}
            </Button>
          </div>
        )}
      </section>

      <div aria-live="polite" className="problems-result">
        {error && <Alert tone="error">{error}</Alert>}
        {data && (
          <p className="problems-result__count">{t('problems.found', { count: data.total })}</p>
        )}
      </div>

      {loading && (
        <ul className="problem-grid" aria-busy="true" aria-label={t('common.loading')}>
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="problem-card">
              <Skeleton width="60%" />
              <Skeleton height="1.4em" />
              <Skeleton width="40%" />
              <Skeleton width="80%" />
            </li>
          ))}
        </ul>
      )}

      {data && data.items.length === 0 && (
        <EmptyState
          icon={<SearchX size={28} />}
          title={t('problems.empty.title')}
          description={t('problems.empty.description')}
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={reset}>
                {t('problems.filters.reset')}
              </Button>
            ) : undefined
          }
        />
      )}

      {data && data.items.length > 0 && (
        <>
          <ul className="problem-grid">
            {data.items.map((problem) => (
              <li key={problem.id}>
                <ProblemCard problem={problem} />
              </li>
            ))}
          </ul>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onChange={(p) => {
              update({ page: p > 1 ? String(p) : '' });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </>
      )}
    </div>
  );
}
