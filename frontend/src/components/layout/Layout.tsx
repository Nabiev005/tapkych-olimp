import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { Footer } from './Footer';
import { Header } from './Header';
import { PageSuspense } from './PageLoader';
import './layout.css';

export function Layout() {
  const { t } = useTranslation();

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <Header />
      <main id="main" className="app-main" tabIndex={-1}>
        <PageSuspense>
          <Outlet />
        </PageSuspense>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
