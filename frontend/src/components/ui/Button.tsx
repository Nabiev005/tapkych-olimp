import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'white';
type Size = 'sm' | 'md' | 'lg';

interface StyleProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

function classes({ variant = 'primary', size = 'md', block }: StyleProps, extra?: string): string {
  return ['btn', `btn--${variant}`, size !== 'md' && `btn--${size}`, block && 'btn--block', extra]
    .filter(Boolean)
    .join(' ');
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleProps {
  children: ReactNode;
  /** Shows a spinner and disables the button */
  loading?: boolean;
}

export function Button({
  variant,
  size,
  block,
  className,
  type = 'button',
  loading,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={classes({ variant, size, block }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export interface ButtonLinkProps extends LinkProps, StyleProps {}

/** Router link styled as a button */
export function ButtonLink({ variant, size, block, className, ...rest }: ButtonLinkProps) {
  return <Link className={classes({ variant, size, block }, className)} {...rest} />;
}
