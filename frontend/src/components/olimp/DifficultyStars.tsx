import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** 1–5 stars; the accessible label reads "Difficulty: 3/5". */
export function DifficultyStars({ value }: { value: number }) {
  const { t } = useTranslation();
  return (
    <span
      className="difficulty"
      role="img"
      aria-label={t('problems.difficulty.label', { value })}
      title={t('problems.difficulty.label', { value })}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          aria-hidden="true"
          className={n <= value ? 'difficulty__star is-on' : 'difficulty__star'}
          fill={n <= value ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
}
