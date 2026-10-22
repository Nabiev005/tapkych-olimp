import { Award, PartyPopper } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../hooks/useLanguage';
import type { UnlockedAchievement } from '../../services/problems';
import { levelName } from '../../utils/levels';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export interface Celebration {
  newLevel: number | null;
  achievements: UnlockedAchievement[];
}

/** Congratulation modal for a new level and/or unlocked achievements (7.5). */
export function CelebrationModal({
  celebration,
  onClose,
}: {
  celebration: Celebration | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const open = Boolean(celebration);
  const level = celebration?.newLevel ?? null;
  const achievements = celebration?.achievements ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<PartyPopper size={36} />}
      title={level ? t('problems.celebrate.levelTitle') : t('problems.celebrate.achievementTitle')}
      footer={
        <Button onClick={onClose} block>
          {t('problems.celebrate.close')}
        </Button>
      }
    >
      {level && (
        <p className="celebrate__text">
          {t('problems.celebrate.levelText', { name: levelName(level, language) })}
        </p>
      )}
      {achievements.length > 0 && (
        <ul className="celebrate__list">
          {achievements.map((a) => (
            <li key={a.code} className="celebrate__item">
              <span className="celebrate__icon" aria-hidden="true">
                <Award size={22} />
              </span>
              <span>
                <strong>{language === 'ru' ? a.nameRu : a.nameKy}</strong>
                <span className="celebrate__desc">
                  {language === 'ru' ? a.descriptionRu : a.descriptionKy}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
