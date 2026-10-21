import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../hooks/useLanguage';
import type { Language } from '../../i18n';

const OPTIONS: {
  value: Language;
  shortKey: 'common.language.shortKy' | 'common.language.shortRu';
  nameKey: 'common.language.ky' | 'common.language.ru';
}[] = [
  { value: 'ky', shortKey: 'common.language.shortKy', nameKey: 'common.language.ky' },
  { value: 'ru', shortKey: 'common.language.shortRu', nameKey: 'common.language.ru' },
];

/** KY / RU segmented switch, always visible in the header. */
export function LanguageSwitcher() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  return (
    <div className="lang-switch" role="group" aria-label={t('common.language.label')}>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className="lang-switch__option"
          aria-pressed={language === option.value}
          // Each language name is announced in its own language
          lang={option.value}
          title={t(option.nameKey)}
          onClick={() => setLanguage(option.value)}
        >
          <span aria-hidden="true">{t(option.shortKey)}</span>
          <span className="visually-hidden">{t(option.nameKey)}</span>
        </button>
      ))}
    </div>
  );
}
