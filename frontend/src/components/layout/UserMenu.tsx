import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/** Avatar button with a small dropdown (profile, logout). */
export function UserMenu() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t('auth.menu.label')}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="avatar" aria-hidden="true">
          {initials(user.fullName)}
        </span>
        <span className="user-menu__name">{user.fullName.split(' ')[0]}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="user-menu__panel" id={menuId} role="menu">
          <div className="user-menu__head">
            <strong>{user.fullName}</strong>
            <span>
              {t(`auth.roles.${user.role}`)} · {t('auth.menu.level', { level: user.level })}
            </span>
          </div>
          <Link
            to="/profile"
            role="menuitem"
            className="user-menu__item"
            onClick={() => setOpen(false)}
          >
            <UserRound size={18} aria-hidden="true" />
            {t('auth.menu.profile')}
          </Link>
          <button
            type="button"
            role="menuitem"
            className="user-menu__item"
            onClick={() => {
              setOpen(false);
              void logout().then(() => navigate('/'));
            }}
          >
            <LogOut size={18} aria-hidden="true" />
            {t('auth.menu.logout')}
          </button>
        </div>
      )}
    </div>
  );
}
