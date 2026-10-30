import { Suspense, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../ui/Skeleton';

/** Placeholder while a code-split page chunk loads. */
function PageFallback() {
  const { t } = useTranslation();
  return (
    <div className="container page-loader" role="status" aria-live="polite">
      <span className="visually-hidden">{t('common.loading')}</span>
      <Skeleton width="40%" height="2rem" />
      <Skeleton height="1rem" />
      <Skeleton width="80%" height="1rem" />
    </div>
  );
}

export function PageSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}
