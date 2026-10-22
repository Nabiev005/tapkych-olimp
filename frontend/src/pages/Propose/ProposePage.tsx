import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ProblemForm } from '../../components/olimp/ProblemForm';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useLanguage } from '../../hooks/useLanguage';
import { ApiError, errorMessage } from '../../services/api';
import { classesApi, type Proposal } from '../../services/classes';
import { formatDate } from '../../utils/format';
import { pickText } from '../../utils/localize';
import { EMPTY_PROBLEM, toProblemPayload, type ProblemFormValues } from '../../utils/problemForm';
import '../Classes/Classes.css';

const STATUS_TONE = { DRAFT: 'warning', PUBLISHED: 'success', ARCHIVED: 'neutral' } as const;

/** Teachers propose problems; they stay DRAFT until an admin publishes them. */
export function ProposePage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [values, setValues] = useState<ProblemFormValues>(EMPTY_PROBLEM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);

  const loadProposals = useCallback(() => {
    classesApi
      .myProposals()
      .then(setProposals)
      .catch(() => setProposals([]));
  }, []);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setErrors({});
    try {
      await classesApi.propose(toProblemPayload(values));
      setValues(EMPTY_PROBLEM);
      setMessage({ tone: 'success', text: t('propose.sent') });
      loadProposals();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') setErrors(err.fieldErrors);
      setMessage({ tone: 'error', text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container page">
      <header className="page-header">
        <h1 className="page-header__title">{t('propose.title')}</h1>
        <p className="page-header__subtitle">{t('propose.subtitle')}</p>
      </header>

      <form onSubmit={onSubmit} noValidate className="propose-form">
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        <ProblemForm values={values} onChange={setValues} errors={errors} />
        <Button type="submit" size="lg" loading={saving}>
          {t('propose.submit')}
        </Button>
      </form>

      {proposals.length > 0 && (
        <section className="classes-section propose-list" aria-labelledby="my-proposals">
          <h2 id="my-proposals" className="section-title">
            {t('propose.mine')}
          </h2>
          <ul className="assignment-list">
            {proposals.map((p) => (
              <li key={p.id} className="card assignment-item">
                <span className="assignment-item__title">
                  {pickText(p.titleKy, p.titleRu, language).text}{' '}
                  <Badge tone={STATUS_TONE[p.status]}>{t(`propose.status.${p.status}`)}</Badge>
                </span>
                <span className="assignment-item__meta">{formatDate(p.createdAt, language)}</span>
                {p.reviewNote && (
                  <span className="assignment-item__meta">
                    {t('propose.reviewNote', { note: p.reviewNote })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
