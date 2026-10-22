import { Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Current streak in days; the flame is grey when the streak is 0. */
export function StreakFlame({ days, longest }: { days: number; longest?: number }) {
  const { t } = useTranslation();
  return (
    <div className={`streak${days > 0 ? ' is-active' : ''}`}>
      <span className="streak__icon" aria-hidden="true">
        <Flame size={28} fill={days > 0 ? 'currentColor' : 'none'} />
      </span>
      <span>
        <strong className="streak__value">{t('profile.streakDays', { count: days })}</strong>
        <span className="streak__label">
          {longest !== undefined
            ? t('profile.streakLongest', { count: longest })
            : t('profile.streak')}
        </span>
      </span>
    </div>
  );
}
