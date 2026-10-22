import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { NotFoundPage } from '../../pages/NotFound/NotFoundPage';

function PageLoading() {
  const { t } = useTranslation();
  return (
    <div className="page-loading" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{t('common.loading')}</span>
    </div>
  );
}

/** Signed-in users only; guests go to /login?next=... */
export function RequireAuth({
  children,
  permission,
}: {
  children: ReactNode;
  permission?: string;
}) {
  const { status } = useAuth();
  const { can } = usePermissions();
  const location = useLocation();

  if (status === 'loading') return <PageLoading />;
  if (status === 'guest') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  // Hide the existence of pages the user may not open
  if (permission && !can(permission)) return <NotFoundPage />;
  return <>{children}</>;
}

/** Login / register pages: signed-in users are sent home */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') return <PageLoading />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <>{children}</>;
}
