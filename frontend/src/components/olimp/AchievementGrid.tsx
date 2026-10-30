import {
  Atom,
  Award,
  BookOpenCheck,
  Cpu,
  Crown,
  Flame,
  Lock,
  Medal,
  Mountain,
  MountainSnow,
  Sigma,
  Sparkles,
  Timer,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../hooks/useLanguage';
import type { ProfileAchievement } from '../../services/rating';
import { formatDate } from '../../utils/format';

// Icon names come from Achievement.icon (seed data)
const ICONS: Record<string, LucideIcon> = {
  Atom,
  Award,
  BookOpenCheck,
  Cpu,
  Crown,
  Flame,
  Medal,
  Mountain,
  MountainSnow,
  Sigma,
  Sparkles,
  Timer,
  Trophy,
  Zap,
};

export function AchievementGrid({ achievements }: { achievements: ProfileAchievement[] }) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  return (
    <ul className="achievements">
      {achievements.map((a) => {
        const Icon = ICONS[a.icon] ?? Award;
        const unlocked = Boolean(a.unlockedAt);
        return (
          <li key={a.code} className={`achievement${unlocked ? ' is-unlocked' : ''}`}>
            <span className="achievement__icon" aria-hidden="true">
              {unlocked ? <Icon size={22} /> : <Lock size={20} />}
            </span>
            <span className="achievement__body">
              <strong>{language === 'ru' ? a.nameRu : a.nameKy}</strong>
              <span className="achievement__desc">
                {language === 'ru' ? a.descriptionRu : a.descriptionKy}
              </span>
              <span className="achievement__state">
                {unlocked
                  ? t('profile.achievements.unlocked', {
                      date: formatDate(a.unlockedAt!, language),
                    })
                  : t('profile.achievements.locked')}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
