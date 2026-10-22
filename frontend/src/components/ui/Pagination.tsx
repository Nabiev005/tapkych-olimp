import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

/** Compact pages around the current one: 1 … 4 5 6 … 12 */
function visiblePages(page: number, total: number): (number | 'gap')[] {
  const pages = new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) result.push('gap');
    result.push(p);
  });
  return result;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label={t('common.pagination.label')}>
      <button
        type="button"
        className="pagination__item"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label={t('common.pagination.prev')}
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      {visiblePages(page, totalPages).map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="pagination__gap" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className="pagination__item"
            aria-current={p === page ? 'page' : undefined}
            aria-label={t('common.pagination.page', { page: p })}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className="pagination__item"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label={t('common.pagination.next')}
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </nav>
  );
}
