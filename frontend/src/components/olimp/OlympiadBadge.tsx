import { useTranslation } from 'react-i18next';
import type { OlympiadLevel } from '../../services/problems';
import { Badge } from '../ui/Badge';

const TONES: Record<OlympiadLevel, 'neutral' | 'primary' | 'success' | 'warning' | 'accent'> = {
  SCHOOL: 'neutral',
  DISTRICT: 'success',
  REGION: 'primary',
  NATIONAL: 'warning',
  INTERNATIONAL: 'accent',
};

export function OlympiadBadge({ level }: { level: OlympiadLevel }) {
  const { t } = useTranslation();
  return <Badge tone={TONES[level]}>{t(`problems.levels.${level}`)}</Badge>;
}
