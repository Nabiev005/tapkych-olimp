import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

/** Cycles system → light → dark. */
export function ThemeSwitcher() {
  const { t } = useTranslation();
  const { preference, cycle } = useTheme();
  const Icon = ICONS[preference];
  const current = t(`common.theme.${preference}`);

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={cycle}
      aria-label={t('common.theme.toggle', { current })}
      title={current}
    >
      <Icon size={20} aria-hidden="true" />
    </button>
  );
}
