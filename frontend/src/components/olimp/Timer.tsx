import { Clock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDuration } from '../../utils/duration';

interface TimerProps {
  /** ISO time to count down to */
  target: string;
  /** serverTime − clientTime in ms, so the countdown follows the server clock */
  offsetMs: number;
  label: string;
  onDone?: () => void;
  /** Highlight when less than this many ms remain */
  warnBelowMs?: number;
}

/**
 * Countdown display. The server decides what is allowed; this is only a view of
 * the server clock (offset from the API's serverTime).
 */
export function Timer({ target, offsetMs, label, onDone, warnBelowMs = 5 * 60_000 }: TimerProps) {
  const { t } = useTranslation();
  const targetMs = Date.parse(target);
  const [now, setNow] = useState(() => Date.now() + offsetMs);
  const done = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now() + offsetMs), 1000);
    return () => window.clearInterval(id);
  }, [offsetMs]);

  const remaining = targetMs - now;
  useEffect(() => {
    if (remaining <= 0 && !done.current) {
      done.current = true;
      onDone?.();
    }
  }, [remaining, onDone]);

  const warn = remaining > 0 && remaining < warnBelowMs;
  return (
    <div className={`timer${warn ? ' is-warning' : ''}`}>
      <Clock size={20} aria-hidden="true" />
      <span className="timer__label">{label}</span>
      {/* Not a live region: announcing every second would be noise */}
      <span
        className="timer__value"
        aria-label={t('contests.timeLeftLabel', { time: formatDuration(remaining) })}
      >
        {formatDuration(remaining)}
      </span>
    </div>
  );
}
