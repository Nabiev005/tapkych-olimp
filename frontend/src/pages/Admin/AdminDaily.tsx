import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SelectField, TextField } from '../../components/ui/Field';
import { useLanguage } from '../../hooks/useLanguage';
import { adminApi, type DailyEntry } from '../../services/admin';
import { errorMessage } from '../../services/api';
import { problemsApi, type ProblemCard } from '../../services/problems';
import { formatDate } from '../../utils/format';
import { pickText } from '../../utils/localize';

/** Schedule daily problems; days without a choice get an automatic pick. */
export function AdminDaily() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [today, setToday] = useState('');
  const [items, setItems] = useState<DailyEntry[]>([]);
  const [date, setDate] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProblemCard[]>([]);
  const [slug, setSlug] = useState('');
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminApi
      .daily()
      .then((d) => {
        setToday(d.today);
        setItems(d.items);
      })
      .catch((err: unknown) => setMessage({ tone: 'error', text: errorMessage(err) }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      problemsApi
        .list({ q: query.trim() || undefined, pageSize: 20 })
        .then((page) => !cancelled && setResults(page.items))
        .catch(() => !cancelled && setResults([]));
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!date || !slug) return;
    setBusy(true);
    setMessage(null);
    try {
      await adminApi.setDaily(date, slug);
      setMessage({ tone: 'success', text: t('admin.daily.saved') });
      load();
    } catch (err) {
      setMessage({ tone: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-section-wrap">
      <p className="admin-note">{t('admin.daily.hint')}</p>
      <form className="card admin-section admin-form" onSubmit={save} noValidate>
        <h2 className="section-title">{t('admin.daily.planTitle')}</h2>
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        <TextField
          label={t('admin.daily.date')}
          type="date"
          min={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <TextField
          label={t('admin.daily.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <SelectField
          label={t('admin.daily.problem')}
          placeholder={t('auth.fields.regionPlaceholder')}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          options={results.map((p) => ({
            value: p.slug,
            label: pickText(p.titleKy, p.titleRu, language).text,
          }))}
        />
        <Button type="submit" loading={busy} disabled={!date || !slug}>
          {t('admin.daily.save')}
        </Button>
      </form>

      <section className="card admin-section">
        <h2 className="section-title">{t('admin.daily.scheduleTitle')}</h2>
        {items.length === 0 ? (
          <p className="dashboard__empty">{t('admin.daily.empty')}</p>
        ) : (
          <ul className="admin-rank">
            {items.map((d) => (
              <li key={d.date}>
                <span>
                  <strong>{formatDate(`${d.date}T06:00:00Z`, language)}</strong>
                  {d.date === today && <Badge tone="primary">{t('admin.daily.today')}</Badge>}
                </span>
                <span>
                  <Link to={`/problems/${d.problem.slug}`}>
                    {pickText(d.problem.titleKy, d.problem.titleRu, language).text}
                  </Link>{' '}
                  <Badge tone={d.isAuto ? 'neutral' : 'success'}>
                    {d.isAuto ? t('admin.daily.auto') : t('admin.daily.manual')}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
