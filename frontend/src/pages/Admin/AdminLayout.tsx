import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router-dom';
import { PageSuspense } from '../../components/layout/PageLoader';
import './Admin.css';

const LINKS = [
  { to: '/admin', key: 'overview', end: true },
  { to: '/admin/problems', key: 'problems', end: false },
  { to: '/admin/proposals', key: 'proposals', end: false },
  { to: '/admin/import', key: 'import', end: false },
  { to: '/admin/users', key: 'users', end: false },
  { to: '/admin/taxonomy', key: 'taxonomy', end: false },
  { to: '/admin/daily', key: 'daily', end: false },
] as const;

/** Admin shell: section navigation + nested routes */
export function AdminLayout() {
  const { t } = useTranslation();
  return (
    <div className="container page admin">
      <header className="page-header">
        <h1 className="page-header__title">{t('admin.title')}</h1>
      </header>
      <nav className="admin-nav" aria-label={t('admin.navLabel')}>
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `admin-nav__link${isActive ? ' is-active' : ''}`}
          >
            {t(`admin.nav.${link.key}`)}
          </NavLink>
        ))}
      </nav>
      <div className="admin__content">
        <PageSuspense>
          <Outlet />
        </PageSuspense>
      </div>
    </div>
  );
}
