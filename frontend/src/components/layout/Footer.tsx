import { useTranslation } from 'react-i18next';
import { Logo } from './Logo';

export const TAPKYCH_ORDO_URL = 'https://tapkych.com';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <Logo size={28} />
        <p>{t('common.footer.rights', { year: new Date().getFullYear() })}</p>
        <p className="site-footer__muted">{t('common.footer.free')}</p>
        <a href={TAPKYCH_ORDO_URL} className="site-footer__link">
          {t('common.footer.partOf')}
        </a>
      </div>
    </footer>
  );
}
