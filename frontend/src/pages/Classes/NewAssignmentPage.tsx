import { ArrowLeft } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ProblemPicker } from '../../components/olimp/ProblemPicker';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { ApiError, errorMessage } from '../../services/api';
import { classesApi } from '../../services/classes';
import type { ProblemCard } from '../../services/problems';
import './Classes.css';

const MAX_PROBLEMS = 30;

export function NewAssignmentPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [titleKy, setTitleKy] = useState('');
  const [titleRu, setTitleRu] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selected, setSelected] = useState<ProblemCard[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

        <ProblemPicker
          selected={selected}
          onChange={setSelected}
          max={MAX_PROBLEMS}
          error={fieldErrors.problemSlugs}
        />

        <Button type="submit" size="lg" loading={saving}>
          {t('classes.newForm.submit')}
        </Button>
      </form>
    </div>
  );
}
