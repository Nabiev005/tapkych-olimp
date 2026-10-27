import { ArrowDown, ArrowUp, Plus, Search, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../hooks/useLanguage';
import { problemsApi, type ProblemCard, type Subject } from '../../services/problems';
import { pickName, pickText } from '../../utils/localize';
import { Button } from '../ui/Button';
import { SelectField, TextField } from '../ui/Field';
import { DifficultyStars } from './DifficultyStars';
import './ProblemPicker.css';

interface ProblemPickerProps {
  selected: ProblemCard[];
  onChange: (selected: ProblemCard[]) => void;
  max?: number;
  error?: string;
  /** Extra controls per selected problem (e.g. contest points) */
  renderExtra?: (problem: ProblemCard, index: number) => ReactNode;
}

/** Search the catalog on the left, ordered selection on the right. */
export function ProblemPicker({
  selected,
  onChange,
  max = 30,
  error,
  renderExtra,
}: ProblemPickerProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subject, setSubject] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ProblemCard[]>([]);

  useEffect(() => {
    problemsApi
      .subjects()
      .then(setSubjects)
      .catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    problemsApi
      .list({ subject: subject || undefined, q: search || undefined, pageSize: 20 })
      .then((page) => !cancelled && setResults(page.items))
      .catch(() => !cancelled && setResults([]));
    return () => {
      cancelled = true;
    };
  }, [subject, search]);

  const isSelected = (p: ProblemCard) => selected.some((s) => s.id === p.id);
  const move = (index: number, delta: number) => {
    const next = [...selected];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item!);
    onChange(next);
  };

  return (
    <div className="picker">
      <section className="card picker__panel" aria-labelledby="picker-title">
        <h2 id="picker-title" className="section-title">
          {t('classes.newForm.catalog')}
        </h2>
        <div className="picker__filters">
          <SelectField
            label={t('problems.filters.subject')}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            options={[
              { value: '', label: t('problems.filters.all') },
              ...subjects.map((s) => ({ value: s.slug, label: pickName(s, language) })),
            ]}
          />
          <div className="picker__search">
            <TextField
              label={t('problems.filters.search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setSearch(query.trim());
                }
              }}
            />
            <Button
              variant="secondary"
              onClick={() => setSearch(query.trim())}
              aria-label={t('problems.filters.searchButton')}
            >
              <Search size={18} aria-hidden="true" />
            </Button>
          </div>
        </div>
        <ul className="picker__list">
          {results.map((p) => (
            <li key={p.id} className="picker__item">
              <span className="picker__name">
                {pickText(p.titleKy, p.titleRu, language).text}
                <span className="picker__meta">
                  {pickName(p.topic, language)} <DifficultyStars value={p.difficulty} />
                </span>
              </span>
              <Button
                size="sm"
                variant={isSelected(p) ? 'ghost' : 'secondary'}
                disabled={isSelected(p) || selected.length >= max}
                onClick={() => onChange([...selected, p])}
                aria-label={t('classes.newForm.add', { title: p.titleKy })}
              >
                <Plus size={16} aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card picker__panel" aria-labelledby="selected-title">
        <h2 id="selected-title" className="section-title">
          {t('classes.newForm.selected', { count: selected.length })}
        </h2>
        {error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}
        {selected.length === 0 ? (
          <p className="dashboard__empty">{t('classes.newForm.empty')}</p>
        ) : (
          <ol className="picker__list">
            {selected.map((p, index) => (
              <li key={p.id} className="picker__item">
                <span className="picker__name">
                  {index + 1}. {pickText(p.titleKy, p.titleRu, language).text}
                </span>
                {renderExtra?.(p, index)}
                <span className="picker__controls">
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={t('classes.newForm.up')}
                  >
                    <ArrowUp size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={index === selected.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={t('classes.newForm.down')}
                  >
                    <ArrowDown size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => onChange(selected.filter((s) => s.id !== p.id))}
                    aria-label={t('classes.newForm.remove')}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
