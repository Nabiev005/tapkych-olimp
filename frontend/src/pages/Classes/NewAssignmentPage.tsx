import { ArrowDown, ArrowLeft, ArrowUp, Plus, Search, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DifficultyStars } from '../../components/olimp/DifficultyStars';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { SelectField, TextField } from '../../components/ui/Field';
import { useLanguage } from '../../hooks/useLanguage';
import { ApiError, errorMessage } from '../../services/api';
import { classesApi } from '../../services/classes';
import { problemsApi, type ProblemCard, type Subject } from '../../services/problems';
import { pickName, pickText } from '../../utils/localize';
import './Classes.css';

const MAX_PROBLEMS = 30;

export function NewAssignmentPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [titleKy, setTitleKy] = useState('');
  const [titleRu, setTitleRu] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selected, setSelected] = useState<ProblemCard[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subject, setSubject] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ProblemCard[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    setSelected(next);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (titleKy.trim().length < 2) errors.titleKy = t('auth.validation.required');
    if (selected.length === 0) errors.problemSlugs = t('classes.newForm.pickAtLeastOne');
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    setError(null);
    try {
      const created = await classesApi.createAssignment(id, {
        titleKy: titleKy.trim(),
        titleRu: titleRu.trim() || null,
        // datetime-local is local time; send an absolute instant
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        problemSlugs: selected.map((p) => p.slug),
      });
      navigate(`/classes/${id}/assignments/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR')
        setFieldErrors(err.fieldErrors);
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container page class-page">
      <Link to={`/classes/${id}`} className="back-link">
        <ArrowLeft size={18} aria-hidden="true" />
        {t('classes.backToClass')}
      </Link>
      <h1 className="page-header__title">{t('classes.newForm.title')}</h1>

      <form className="assignment-form" onSubmit={onSubmit} noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="card assignment-form__details">
          <TextField
            label={t('classes.newForm.titleKy')}
            value={titleKy}
            maxLength={200}
            onChange={(e) => setTitleKy(e.target.value)}
            error={fieldErrors.titleKy}
          />
          <TextField
            label={t('classes.newForm.titleRu')}
            value={titleRu}
            maxLength={200}
            onChange={(e) => setTitleRu(e.target.value)}
          />
          <TextField
            label={t('classes.newForm.dueDate')}
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            error={fieldErrors.dueDate}
          />
        </div>

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
                    disabled={isSelected(p) || selected.length >= MAX_PROBLEMS}
                    onClick={() => setSelected([...selected, p])}
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
            {fieldErrors.problemSlugs && (
              <p className="field__error" role="alert">
                {fieldErrors.problemSlugs}
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
                        onClick={() => setSelected(selected.filter((s) => s.id !== p.id))}
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

        <Button type="submit" size="lg" loading={saving}>
          {t('classes.newForm.submit')}
        </Button>
      </form>
    </div>
  );
}
