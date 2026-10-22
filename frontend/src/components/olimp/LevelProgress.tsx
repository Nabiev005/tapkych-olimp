import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../hooks/useLanguage';
import { formatNumber } from '../../utils/format';
import { levelName } from '../../utils/levels';
import { LevelBadge } from './LevelBadge';

interface LevelProgressProps {
  level: number;
  totalPoints: number;
  progress: number;
  pointsToNext: number;
  nextLevel: number | null;
}

/** Current level, points and a progress bar towards the next level. */
export function LevelProgress({
  level,
  totalPoints,
  progress,
  pointsToNext,
  nextLevel,
}: LevelProgressProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const percent = Math.round(progress * 100);

  return (
    <div className="level-progress">
      <div className="level-progress__head">
        <LevelBadge level={level} />
        <span className="level-progress__points">
          {t('profile.points', { points: formatNumber(totalPoints, language) })}
        </span>
      </div>
      <div
        className="progress-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={t('profile.levelProgress')}
      >
        <span className="progress-bar__fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="level-progress__hint">
        {nextLevel
          ? t('profile.toNextLevel', {
              points: formatNumber(pointsToNext, language),
              name: levelName(nextLevel, language),
            })
          : t('profile.maxLevel')}
      </p>
    </div>
  );
}
