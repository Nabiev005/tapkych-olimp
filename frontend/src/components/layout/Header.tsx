import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router-dom';
import { ButtonLink } from '../ui/Button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NAV_ITEMS } from './navItems';
import { ThemeSwitcher } from './ThemeSwitcher';

export function Header() {
  const { t } = useTranslation();

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="brand">
          <span className="brand__mark" aria-hidden="true">
            <Star size={18} fill="currentColor" />
          </span>
          <span className="brand__name">{t('common.appName')}</span>
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
          <ButtonLink to="/login" variant="accent" size="sm" className="site-header__login">
            {t('common.actions.login')}
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
