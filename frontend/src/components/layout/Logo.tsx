import { useTranslation } from 'react-i18next';

/**
 * Brand mark: mountain with a gold peak, a gold star and a base line.
 * The mountain uses currentColor (navy on light, white on dark); gold stays fixed.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M32 3l1.7 4.3L38 9l-4.3 1.7L32 15l-1.7-4.3L26 9l4.3-1.7z" fill="#F0A81C" />
      <path d="M7 50L27 18.5l5.2 7.6 6.8-9.6L57 50z" fill="currentColor" />
      <path d="M27 18.5l3.6 5.6-3.6 3.4-3.6-3.4z" fill="#F0A81C" />
      <rect x="7" y="54" width="50" height="4.5" rx="2.25" fill="currentColor" />
    </svg>
  );
}

/** Mark + wordmark "Тапкыч Олимп" (first word bold, as in the brand book) */
export function Logo({
  size = 32,
  stacked = false,
  tagline = false,
}: {
  size?: number;
  /** Two-line wordmark (hero, auth pages) */
  stacked?: boolean;
  tagline?: boolean;
}) {
  const { t } = useTranslation();
  const [first, ...rest] = t('common.appName').split(' ');
  return (
    <span className={`logo${stacked ? ' logo--stacked' : ''}`}>
      <LogoMark size={size} className="logo__mark" />
      <span className="logo__text">
        <span className="logo__word">
          <strong>{first}</strong> <span>{rest.join(' ')}</span>
        </span>
        {tagline && <span className="logo__tagline">{t('common.logoTagline')}</span>}
      </span>
    </span>
  );
}
