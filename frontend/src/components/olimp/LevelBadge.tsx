import { Medal } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { levelName } from '../../utils/levels';

export function LevelBadge({ level }: { level: number }) {
  const { language } = useLanguage();
  return (
    <span className={`level-badge level-badge--${Math.min(level, 7)}`}>
      <Medal size={14} aria-hidden="true" />
      {levelName(level, language)}
    </span>
  );
}
