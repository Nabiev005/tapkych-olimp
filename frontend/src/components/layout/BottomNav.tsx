import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';

/** Mobile-only bottom navigation bar. */
export function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav className="bottom-nav" aria-label={t('common.nav.mobile')}>
      {NAV_ITEMS.filter((item) => item.mobile).map(({ to, labelKey, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `bottom-nav__item${isActive ? ' is-active' : ''}`}
        >
          <Icon size={22} aria-hidden="true" />
          <span className="bottom-nav__label">{t(labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
