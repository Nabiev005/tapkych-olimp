import { ArrowLeft } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ProblemPicker } from '../../components/olimp/ProblemPicker';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextAreaField, TextField } from '../../components/ui/Field';
import { ApiError, errorMessage } from '../../services/api';
import { contestsApi } from '../../services/contests';
import type { ProblemCard } from '../../services/problems';
import '../Classes/Classes.css';
import './Contests.css';

const DEFAULT_POINTS = 100;

/** Public contest (admins) or class contest (?classId=, the class teacher). */
export function NewContestPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const classId = params.get('classId');

  const [titleKy, setTitleKy] = useState('');
  const [titleRu, setTitleRu] = useState('');
  const [descriptionKy, setDescriptionKy] = useState('');
  const [descriptionRu, setDescriptionRu] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [duration, setDuration] = useState(120);
  const [showVerdicts, setShowVerdicts] = useState(false);
  const [selected, setSelected] = useState<ProblemCard[]>([]);
  const [points, setPoints] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (titleKy.trim().length < 3) errors.titleKy = t('auth.validation.required');
    if (!startsAt) errors.startsAt = t('auth.validation.required');
    if (!endsAt) errors.endsAt = t('auth.validation.required');
    if (selected.length === 0) errors.problems = t('classes.newForm.pickAtLeastOne');
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    setError(null);
    try {
      const created = await contestsApi.create({
        titleKy: titleKy.trim(),
        titleRu: titleRu.trim() || null,
        descriptionKy: descriptionKy.trim(),
        descriptionRu: descriptionRu.trim() || null,
        // datetime-local is the user's local time; send absolute instants
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        durationMinutes: duration,
        classId,
        showVerdicts,
        problems: selected.map((p) => ({ slug: p.slug, points: points[p.id] ?? DEFAULT_POINTS })),
      });
      navigate(`/contests/${created.id}`);
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
      <Link to={classId ? `/classes/${classId}` : '/contests'} className="back-link">
        <ArrowLeft size={18} aria-hidden="true" />
        {classId ? t('classes.backToClass') : t('contests.back')}
      </Link>
      <h1 className="page-header__title">
        {classId ? t('contests.newForm.titleClass') : t('contests.newForm.title')}
      </h1>

      <form className="assignment-form" onSubmit={onSubmit} noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="card contest-form">
          <TextField
            label={t('contests.newForm.titleKy')}
            value={titleKy}
            maxLength={200}
            onChange={(e) => setTitleKy(e.target.value)}
            error={fieldErrors.titleKy}
          />
          <TextField
            label={t('contests.newForm.titleRu')}
            value={titleRu}
            maxLength={200}
            onChange={(e) => setTitleRu(e.target.value)}
          />
          <TextAreaField
            label={t('contests.newForm.descriptionKy')}
            rows={3}
            value={descriptionKy}
            onChange={(e) => setDescriptionKy(e.target.value)}
          />
          <TextAreaField
            label={t('contests.newForm.descriptionRu')}
            rows={3}
            value={descriptionRu}
            onChange={(e) => setDescriptionRu(e.target.value)}
          />
          <TextField
            label={t('contests.newForm.startsAt')}
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            error={fieldErrors.startsAt}
          />
          <TextField
            label={t('contests.newForm.endsAt')}
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            error={fieldErrors.endsAt}
          />
          <TextField
            label={t('contests.newForm.duration')}
            hint={t('contests.newForm.durationHint')}
            type="number"
            min={5}
            max={600}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 0)}
            error={fieldErrors.durationMinutes}
          />
          <label className="toggle contest-form__toggle">
            <input
              type="checkbox"
              checked={showVerdicts}
              onChange={(e) => setShowVerdicts(e.target.checked)}
            />
            <span className="toggle__track" aria-hidden="true" />
            <span>
              <strong>{t('contests.newForm.showVerdicts')}</strong>
              <span className="toggle__hint">{t('contests.newForm.showVerdictsHint')}</span>
            </span>
          </label>
        </div>

        <ProblemPicker
          selected={selected}
          onChange={setSelected}
          error={fieldErrors.problems}
          renderExtra={(p) => (
            <label className="picker__points">
              <span className="visually-hidden">{t('contests.newForm.points')}</span>
              <input
                className="input"
                type="number"
                min={1}
                max={1000}
                value={points[p.id] ?? DEFAULT_POINTS}
                onChange={(e) => setPoints({ ...points, [p.id]: Number(e.target.value) || 1 })}
              />
            </label>
          )}
        />

        <Button type="submit" size="lg" loading={saving}>
          {t('contests.newForm.submit')}
        </Button>
      </form>
    </div>
  );
}
