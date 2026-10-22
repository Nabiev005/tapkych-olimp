import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../hooks/useLanguage';
import { geoApi } from '../../services/auth';
import { localizedName, type School } from '../../services/types';
import { FieldShell, TextField } from '../ui/Field';
import { describedBy } from '../ui/fieldA11y';
import './SchoolPicker.css';

export interface SchoolValue {
  schoolId: string | null;
  schoolName: string;
  /** "My school is not listed" mode */
  custom: boolean;
}

interface SchoolPickerProps {
  regionId: string;
  value: SchoolValue;
  onChange: (value: SchoolValue) => void;
  error?: string;
}

/** Searchable school combobox (ARIA 1.2 pattern) with a free-text fallback. */
export function SchoolPicker({ regionId, value, onChange, error }: SchoolPickerProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState(value.schoolName);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [results, setResults] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const blurTimer = useRef<number>(undefined);

  // Debounced search within the selected region
  useEffect(() => {
    if (!regionId || value.custom || !open) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      geoApi
        .schools(regionId, query.trim())
        .then((rows) => setResults(rows))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [regionId, query, open, value.custom]);

  if (value.custom) {
    return (
      <div className="school-picker">
        <TextField
          label={t('auth.fields.schoolCustom')}
          placeholder={t('auth.fields.schoolCustomPlaceholder')}
          value={value.schoolName}
          onChange={(e) => onChange({ schoolId: null, schoolName: e.target.value, custom: true })}
          error={error}
          maxLength={150}
          autoComplete="off"
        />
        <button
          type="button"
          className="link-button"
          onClick={() => {
            setQuery('');
            onChange({ schoolId: null, schoolName: '', custom: false });
          }}
        >
          {t('auth.fields.schoolBackToList')}
        </button>
      </div>
    );
  }

  const choose = (school: School) => {
    const name = localizedName(school, language);
    setQuery(name);
    setOpen(false);
    onChange({ schoolId: school.id, schoolName: name, custom: false });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' && open && results[active]) {
      event.preventDefault();
      choose(results[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const disabled = !regionId;
  const hint = disabled ? t('auth.fields.schoolSelectRegionFirst') : undefined;

  return (
    <div className="school-picker">
      <FieldShell id={id} label={t('auth.fields.school')} error={error} hint={hint}>
        <div className="combobox">
          <input
            id={id}
            className="input"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(id, error, hint)}
            placeholder={t('auth.fields.schoolPlaceholder')}
            value={query}
            disabled={disabled}
            autoComplete="off"
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActive(-1);
              // Typing invalidates a previous selection
              if (value.schoolId) onChange({ schoolId: null, schoolName: '', custom: false });
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              blurTimer.current = window.setTimeout(() => setOpen(false), 150);
            }}
            onKeyDown={onKeyDown}
          />
          {open && !disabled && (
            <ul className="combobox__list" id={listId} role="listbox">
              {results.map((school, index) => (
                <li
                  key={school.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={school.id === value.schoolId}
                  className={`combobox__option${index === active ? ' is-active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(school)}
                >
                  {localizedName(school, language)}
                </li>
              ))}
              {!loading && results.length === 0 && (
                <li className="combobox__empty" role="presentation">
                  {t('auth.fields.schoolNoResults')}
                </li>
              )}
            </ul>
          )}
        </div>
      </FieldShell>
      <button
        type="button"
        className="link-button"
        disabled={disabled}
        onClick={() => onChange({ schoolId: null, schoolName: '', custom: true })}
      >
        {t('auth.fields.schoolNotListed')}
      </button>
    </div>
  );
}
