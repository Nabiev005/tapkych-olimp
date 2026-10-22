import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'error' | 'success' | 'info';

const ICONS = { error: AlertCircle, success: CheckCircle2, info: Info } as const;

export function Alert({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  const Icon = ICONS[tone];
  return (
    <div className={`alert alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={20} aria-hidden="true" className="alert__icon" />
      <div>{children}</div>
    </div>
  );
}
