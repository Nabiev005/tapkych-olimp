import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Heading level for the title (default h2) */
  as?: 'h1' | 'h2' | 'h3';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  as: Heading = 'h2',
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon && (
        <div className="empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <Heading className="empty-state__title">{title}</Heading>
      {description && <p className="empty-state__description">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
