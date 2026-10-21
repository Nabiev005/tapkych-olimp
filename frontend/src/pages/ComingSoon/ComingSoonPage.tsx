import { Hammer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

/** Placeholder for sections built in later stages. */
export function ComingSoonPage() {
  const { t } = useTranslation();

  return (
    <div className="container">
      <EmptyState
        as="h1"
        icon={<Hammer size={28} />}
        title={t('common.comingSoon.title')}
        description={t('common.comingSoon.description')}
        action={
          <ButtonLink to="/" variant="secondary">
            {t('common.actions.backHome')}
          </ButtonLink>
        }
      />
    </div>
  );
}
