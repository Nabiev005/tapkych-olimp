import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Shown when Russian is selected but the content exists only in Kyrgyz */
export function TranslationMissing() {
  const { t } = useTranslation();
  return (
    <span className="translation-missing">
      <Languages size={14} aria-hidden="true" />
      {t('problems.translationMissing')}
    </span>
  );
}
