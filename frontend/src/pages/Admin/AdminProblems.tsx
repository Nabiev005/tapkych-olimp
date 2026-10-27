import { MessageSquare, Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button, ButtonLink } from '../../components/ui/Button';
import { SelectField } from '../../components/ui/Field';
import { Pagination } from '../../components/ui/Pagination';
import { Skeleton } from '../../components/ui/Skeleton';
import { useLanguage } from '../../hooks/useLanguage';
import { adminApi, type AdminProblemRow, type ProblemStatus } from '../../services/admin';
import { errorMessage } from '../../services/api';
import { problemsApi, type Page, type Subject } from '../../services/problems';
import { formatDate } from '../../utils/format';
import { pickName, pickText } from '../../utils/localize';

const STATUS_TONE: Record<ProblemStatus, 'warning' | 'success' | 'neutral'> = {
  DRAFT: 'warning',
  PUBLISHED: 'success',
  ARCHIVED: 'neutral',
};

/** Problem table used by "Problems" and "Proposals" (teacher drafts) */
export function AdminProblems({ proposals = false }: { proposals?: boolean }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [status, setStatus] = useState('');
  const [subject, setSubject] = useState('');
  const [query, setQuery] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<AdminProblemRow> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    problemsApi
      .subjects()
      .then(setSubjects)
      .catch(() => setSubjects([]));
  }, []);

  const load = useCallback(() => {
    adminApi
      .problems({ status, subject, q, page, proposals })
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err: unknown) => setError(errorMessage(err)));
  }, [status, subject, q, page, proposals]);

  useEffect(() => {
    load();
  }, [load]);

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setQ(query.trim());
  };

  const quickStatus = async (id: string, next: ProblemStatus) => {
    try {
      await adminApi.setStatus(id, next);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="admin-section-wrap">
      <div className="admin-toolbar">
        <form className="admin-search" onSubmit={onSearch} role="search">
          <label className="visually-hidden" htmlFor="admin-problem-search">
            {t('problems.filters.search')}
          </label>
          <input
            id="admin-problem-search"
            className="input"
            type="search"
            placeholder={t('admin.problems.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" variant="secondary" aria-label={t('problems.filters.searchButton')}>
            <Search size={18} aria-hidden="true" />
          </Button>
        </form>
        {!proposals && (
          <SelectField
            label={t('admin.problems.status')}
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            options={[
              { value: '', label: t('problems.filters.all') },
              ...(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const).map((s) => ({
                value: s,
                label: t(`admin.status.${s}`),
              })),
            ]}
          />
        )}
        <SelectField
          label={t('problems.filters.subject')}
          value={subject}
          onChange={(e) => {
            setPage(1);
            setSubject(e.target.value);
          }}
          options={[
            { value: '', label: t('problems.filters.all') },
            ...subjects.map((s) => ({ value: s.slug, label: pickName(s, language) })),
          ]}
        />
        {!proposals && (
          <ButtonLink to="/admin/problems/new">
            <Plus size={18} aria-hidden="true" />
            {t('admin.problems.new')}
          </ButtonLink>
        )}
      </div>

      {proposals && <p className="admin-note">{t('admin.proposals.hint')}</p>}
      {error && <Alert tone="error">{error}</Alert>}
      {!data && !error && <Skeleton height={200} radius="16px" />}

      {data && (
        <>
          <p className="problems-result__count">{t('problems.found', { count: data.total })}</p>
          <div className="table-wrap">
            <table className="leaderboard admin-table">
              <thead>
                <tr>
                  <th scope="col">{t('admin.problems.title')}</th>
                  <th scope="col">{t('admin.problems.status')}</th>
                  <th scope="col" className="leaderboard__school">
                    {t('admin.problems.author')}
                  </th>
                  <th scope="col" className="leaderboard__school">
                    {t('admin.problems.updated')}
                  </th>
                  <th scope="col">
                    <span className="visually-hidden">{t('classes.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="leaderboard__user">
                        <Link to={`/admin/problems/${p.id}`} className="leaderboard__name">
                          {pickText(p.titleKy, p.titleRu, language).text}
                        </Link>
                        <span className="leaderboard__sub">
                          {pickName(p.subject, language)} · {pickName(p.topic, language)} ·{' '}
                          <code>{p.slug}</code>
                        </span>
                        {p.reviewNote && (
                          <span className="leaderboard__sub">
                            <MessageSquare size={12} aria-hidden="true" /> {p.reviewNote}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <Badge tone={STATUS_TONE[p.status]}>{t(`admin.status.${p.status}`)}</Badge>
                    </td>
                    <td className="leaderboard__school">
                      {p.author
                        ? `${p.author.fullName} (${t(`auth.roles.${p.author.role}`)})`
                        : '—'}
                    </td>
                    <td className="leaderboard__school">{formatDate(p.updatedAt, language)}</td>
                    <td className="admin-actions">
                      {p.status !== 'PUBLISHED' && (
                        <Button size="sm" onClick={() => void quickStatus(p.id, 'PUBLISHED')}>
                          {proposals ? t('admin.proposals.approve') : t('admin.problems.publish')}
                        </Button>
                      )}
                      {p.status === 'PUBLISHED' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void quickStatus(p.id, 'ARCHIVED')}
                        >
                          {t('admin.problems.archive')}
                        </Button>
                      )}
                      <ButtonLink size="sm" variant="secondary" to={`/admin/problems/${p.id}`}>
                        {proposals ? t('admin.proposals.review') : t('admin.problems.edit')}
                      </ButtonLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}

export function AdminProposals() {
  return <AdminProblems proposals />;
}
