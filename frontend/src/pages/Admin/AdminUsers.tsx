import { Search } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SelectField } from '../../components/ui/Field';
import { Pagination } from '../../components/ui/Pagination';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { adminApi, type AdminUser } from '../../services/admin';
import { errorMessage } from '../../services/api';
import type { Page } from '../../services/problems';
import type { Role } from '../../services/types';
import { formatDate } from '../../utils/format';
import { pickName } from '../../utils/localize';

const ROLES: Role[] = ['STUDENT', 'TEACHER', 'ADMIN'];

export function AdminUsers() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user: me } = useAuth();
  const [query, setQuery] = useState('');
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<AdminUser> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    adminApi
      .users({ q, role, page })
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err: unknown) => setError(errorMessage(err)));
  }, [q, role, page]);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (id: string, body: { role?: Role; isActive?: boolean }) => {
    try {
      await adminApi.updateUser(id, body);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setQ(query.trim());
  };

  return (
    <div className="admin-section-wrap">
      <div className="admin-toolbar">
        <form className="admin-search" onSubmit={onSearch} role="search">
          <label className="visually-hidden" htmlFor="admin-user-search">
            {t('admin.users.search')}
          </label>
          <input
            id="admin-user-search"
            className="input"
            type="search"
            placeholder={t('admin.users.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" variant="secondary" aria-label={t('problems.filters.searchButton')}>
            <Search size={18} aria-hidden="true" />
          </Button>
        </form>
        <SelectField
          label={t('admin.users.role')}
          value={role}
          onChange={(e) => {
            setPage(1);
            setRole(e.target.value);
          }}
          options={[
            { value: '', label: t('problems.filters.all') },
            ...ROLES.map((r) => ({ value: r, label: t(`auth.roles.${r}`) })),
          ]}
        />
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {!data && !error && <Skeleton height={200} radius="16px" />}
      {data && (
        <>
          <p className="problems-result__count">{t('problems.found', { count: data.total })}</p>
          <div className="table-wrap">
            <table className="leaderboard admin-table">
              <thead>
                <tr>
                  <th scope="col">{t('admin.users.user')}</th>
                  <th scope="col">{t('admin.users.role')}</th>
                  <th scope="col" className="leaderboard__school">
                    {t('admin.users.registered')}
                  </th>
                  <th scope="col">{t('admin.users.state')}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => {
                  const isMe = u.id === me?.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="leaderboard__user">
                          <Link to={`/u/${u.id}`} className="leaderboard__name">
                            {u.fullName}
                          </Link>
                          <span className="leaderboard__sub">
                            {u.email}
                            {u.school ? ` · ${pickName(u.school, language)}` : ''}
                          </span>
                        </div>
                      </td>
                      <td>
                        <label className="visually-hidden" htmlFor={`role-${u.id}`}>
                          {t('admin.users.role')}
                        </label>
                        <select
                          id={`role-${u.id}`}
                          className="input select admin-role"
                          value={u.role}
                          disabled={isMe}
                          onChange={(e) => void update(u.id, { role: e.target.value as Role })}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {t(`auth.roles.${r}`)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="leaderboard__school">{formatDate(u.createdAt, language)}</td>
                      <td className="admin-actions">
                        <Badge tone={u.isActive ? 'success' : 'danger'}>
                          {u.isActive ? t('admin.users.active') : t('admin.users.blocked')}
                        </Badge>
                        {!isMe && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void update(u.id, { isActive: !u.isActive })}
                          >
                            {u.isActive ? t('admin.users.block') : t('admin.users.unblock')}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
