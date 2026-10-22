import type { ReactNode } from 'react';
import './Auth.css';

/** Centered card used by all auth pages */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="container auth-page">
      <div className="card auth-card">
        <h1 className="auth-card__title">{title}</h1>
        {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
        {children}
      </div>
      {footer && <p className="auth-page__footer">{footer}</p>}
    </div>
  );
}
