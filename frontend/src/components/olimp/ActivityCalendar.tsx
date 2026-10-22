import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../hooks/useLanguage';
import { formatDate } from '../../utils/format';

interface ActivityCalendarProps {
  from: string;
  to: string;
  days: { day: string; count: number }[];
}

// Short month names are the same in Kyrgyz and Russian
const MONTHS_SHORT = [
  'янв',
  'фев',
  'мар',
  'апр',
  'май',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0..4 intensity step (sequential blue ramp --heat-0..4) */
function step(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

/** GitHub-style calendar: one column per week (Mon–Sun), last ~6 months. */
export function ActivityCalendar({ from, to, days }: ActivityCalendarProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { weeks, monthLabels, total, activeDays } = useMemo(() => {
    const counts = new Map(days.map((d) => [d.day, d.count]));
    // Start the grid on the Monday on/before `from`
    const weekday = (new Date(`${from}T00:00:00Z`).getUTCDay() + 6) % 7;
    let cursor = addDays(from, -weekday);
    const result: { day: string; count: number; inRange: boolean }[][] = [];
    const labels: { index: number; label: string }[] = [];
    while (cursor <= to) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push({
          day: cursor,
          count: counts.get(cursor) ?? 0,
          inRange: cursor >= from && cursor <= to,
        });
        cursor = addDays(cursor, 1);
      }
      const firstOfMonth = week.find((d) => d.day.endsWith('-01') && d.inRange);
      if (firstOfMonth || result.length === 0) {
        const month = Number((firstOfMonth ?? week[0]!).day.slice(5, 7)) - 1;
        labels.push({ index: result.length, label: MONTHS_SHORT[month]! });
      }
      result.push(week);
    }
    return {
      weeks: result,
      monthLabels: labels,
      total: days.reduce((sum, d) => sum + d.count, 0),
      activeDays: days.filter((d) => d.count > 0).length,
    };
  }, [from, to, days]);

  // Show the most recent weeks first on narrow screens
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks]);

  const summary = t('profile.activity.summary', { total, days: activeDays });

  return (
    <div className="activity">
      <p className="activity__summary">{summary}</p>
      <div className="activity__scroll" ref={scrollRef}>
        <div
          className="activity__grid"
          role="img"
          aria-label={summary}
          style={{ gridTemplateColumns: `repeat(${weeks.length}, 12px)` }}
        >
          {monthLabels.map((m) => (
            <span
              key={`${m.index}-${m.label}`}
              className="activity__month"
              style={{ gridColumn: m.index + 1 }}
              aria-hidden="true"
            >
              {m.label}
            </span>
          ))}
          {weeks.map((week, w) =>
            week.map((cell, d) => (
              <span
                key={cell.day}
                className={`activity__cell${cell.inRange ? '' : ' is-out'}`}
                data-step={step(cell.count)}
                style={{ gridColumn: w + 1, gridRow: d + 2 }}
                title={
                  cell.inRange
                    ? t('profile.activity.cell', {
                        count: cell.count,
                        date: formatDate(`${cell.day}T06:00:00Z`, language),
                      })
                    : undefined
                }
              />
            )),
          )}
        </div>
      </div>
      <div className="activity__legend" aria-hidden="true">
        <span>{t('profile.activity.less')}</span>
        {[0, 1, 2, 3, 4].map((s) => (
          <span key={s} className="activity__cell" data-step={s} />
        ))}
        <span>{t('profile.activity.more')}</span>
      </div>
    </div>
  );
}
