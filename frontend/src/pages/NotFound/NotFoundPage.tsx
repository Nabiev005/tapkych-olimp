import { Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="container">
      <EmptyState
        as="h1"
        icon={<Compass size={28} />}
        title={t('errors.notFound.title')}
        description={t('errors.notFound.description')}
        action={<ButtonLink to="/">{t('common.actions.backHome')}</ButtonLink>}
      />
    </div>
  );
}
