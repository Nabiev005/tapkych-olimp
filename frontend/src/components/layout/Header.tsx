import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ButtonLink } from '../ui/Button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Logo } from './Logo';
import { NAV_ITEMS } from './navItems';
import { ThemeSwitcher } from './ThemeSwitcher';
import { UserMenu } from './UserMenu';

export function Header() {
  const { t } = useTranslation();
  const { status } = useAuth();

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="brand" aria-label={t('common.appName')}>
          <Logo size={34} />
        </Link>

        <nav className="site-nav" aria-label={t('common.nav.main')}>
          {NAV_ITEMS.filter((item) => item.desktop).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `site-nav__link${isActive ? ' is-active' : ''}`}
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="site-header__actions">
          <LanguageSwitcher />
          <ThemeSwitcher />
          {status === 'authenticated' && <UserMenu />}
          {status === 'guest' && (
            <ButtonLink to="/login" variant="primary" size="sm" className="site-header__login">
              {t('common.actions.login')}
            </ButtonLink>
          )}
        </div>
      </div>
    </header>
  );
}
