import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { SelectField, TextField } from '../../components/ui/Field';
import { useLanguage } from '../../hooks/useLanguage';
import { adminApi, type TaxonomySubject } from '../../services/admin';
import { ApiError, errorMessage } from '../../services/api';
import { geoApi } from '../../services/auth';
import type { Region } from '../../services/types';
import { pickName } from '../../utils/localize';

type Message = { tone: 'success' | 'error'; text: string } | null;

function useSubmit(onDone: () => void) {
  const { t } = useTranslation();
  const [message, setMessage] = useState<Message>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const submit = async (action: () => Promise<unknown>, reset: () => void) => {
    setBusy(true);
    setMessage(null);
    setErrors({});
    try {
      await action();
      reset();
      setMessage({ tone: 'success', text: t('admin.taxonomy.saved') });
      onDone();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') setErrors(err.fieldErrors);
      setMessage({ tone: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };
  return { message, errors, busy, submit };
}

/** Subjects, topics and schools. */
export function AdminTaxonomy() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [subjects, setSubjects] = useState<TaxonomySubject[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);

  const load = useCallback(() => {
    adminApi
      .taxonomy()
      .then(setSubjects)
      .catch(() => setSubjects([]));
  }, []);
  useEffect(() => {
    load();
    geoApi
      .regions()
      .then(setRegions)
      .catch(() => setRegions([]));
  }, [load]);

  // Subject form
  const subjectForm = useSubmit(load);
  const [s, setS] = useState({ slug: '', nameKy: '', nameRu: '', icon: 'BookOpen' });
  const addSubject = (e: FormEvent) => {
    e.preventDefault();
    void subjectForm.submit(
      () => adminApi.createSubject({ ...s, order: subjects.length }),
      () => setS({ slug: '', nameKy: '', nameRu: '', icon: 'BookOpen' }),
    );
  };

  // Topic form
  const topicForm = useSubmit(load);
  const [tp, setTp] = useState({ subjectSlug: '', slug: '', nameKy: '', nameRu: '' });
  const addTopic = (e: FormEvent) => {
    e.preventDefault();
    const count = subjects.find((x) => x.slug === tp.subjectSlug)?.topics.length ?? 0;
    void topicForm.submit(
      () => adminApi.createTopic({ ...tp, order: count }),
      () => setTp({ ...tp, slug: '', nameKy: '', nameRu: '' }),
    );
  };

  // School form
  const schoolForm = useSubmit(() => {});
  const [sc, setSc] = useState({ regionId: '', nameKy: '', nameRu: '', district: '' });
  const addSchool = (e: FormEvent) => {
    e.preventDefault();
    void schoolForm.submit(
      () => adminApi.createSchool({ ...sc, district: sc.district.trim() || null }),
      () => setSc({ ...sc, nameKy: '', nameRu: '', district: '' }),
    );
  };

  return (
    <div className="admin-section-wrap">
      <section className="card admin-section">
        <h2 className="section-title">{t('admin.taxonomy.subjectsTitle')}</h2>
        <ul className="taxonomy-list">
          {subjects.map((subject) => (
            <li key={subject.id}>
              <strong>{pickName(subject, language)}</strong> <code>{subject.slug}</code>
              <ul>
                {subject.topics.map((topic) => (
                  <li key={topic.id}>
                    {pickName(topic, language)} <code>{topic.slug}</code>{' '}
                    <span className="admin-note">
                      {t('admin.taxonomy.problemCount', { count: topic._count.problems })}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <div className="admin-two">
        <form className="card admin-section admin-form" onSubmit={addSubject} noValidate>
          <h2 className="section-title">{t('admin.taxonomy.addSubject')}</h2>
          {subjectForm.message && (
            <Alert tone={subjectForm.message.tone}>{subjectForm.message.text}</Alert>
          )}
          <TextField
            label={t('admin.taxonomy.slug')}
            value={s.slug}
            onChange={(e) => setS({ ...s, slug: e.target.value.toLowerCase() })}
            error={subjectForm.errors.slug}
          />
          <TextField
            label={t('admin.taxonomy.nameKy')}
            value={s.nameKy}
            onChange={(e) => setS({ ...s, nameKy: e.target.value })}
            error={subjectForm.errors.nameKy}
          />
          <TextField
            label={t('admin.taxonomy.nameRu')}
            value={s.nameRu}
            onChange={(e) => setS({ ...s, nameRu: e.target.value })}
            error={subjectForm.errors.nameRu}
          />
          <TextField
            label={t('admin.taxonomy.icon')}
            hint={t('admin.taxonomy.iconHint')}
            value={s.icon}
            onChange={(e) => setS({ ...s, icon: e.target.value })}
          />
          <Button type="submit" loading={subjectForm.busy}>
            {t('admin.taxonomy.add')}
          </Button>
        </form>

        <form className="card admin-section admin-form" onSubmit={addTopic} noValidate>
          <h2 className="section-title">{t('admin.taxonomy.addTopic')}</h2>
          {topicForm.message && (
            <Alert tone={topicForm.message.tone}>{topicForm.message.text}</Alert>
          )}
          <SelectField
            label={t('problems.filters.subject')}
            placeholder={t('auth.fields.regionPlaceholder')}
            value={tp.subjectSlug}
            onChange={(e) => setTp({ ...tp, subjectSlug: e.target.value })}
            options={subjects.map((x) => ({ value: x.slug, label: pickName(x, language) }))}
            error={topicForm.errors.subjectSlug}
          />
          <TextField
            label={t('admin.taxonomy.slug')}
            value={tp.slug}
            onChange={(e) => setTp({ ...tp, slug: e.target.value.toLowerCase() })}
            error={topicForm.errors.slug}
          />
          <TextField
            label={t('admin.taxonomy.nameKy')}
            value={tp.nameKy}
            onChange={(e) => setTp({ ...tp, nameKy: e.target.value })}
            error={topicForm.errors.nameKy}
          />
          <TextField
            label={t('admin.taxonomy.nameRu')}
            value={tp.nameRu}
            onChange={(e) => setTp({ ...tp, nameRu: e.target.value })}
            error={topicForm.errors.nameRu}
          />
          <Button type="submit" loading={topicForm.busy}>
            {t('admin.taxonomy.add')}
          </Button>
        </form>
      </div>

      <form className="card admin-section admin-form" onSubmit={addSchool} noValidate>
        <h2 className="section-title">{t('admin.taxonomy.addSchool')}</h2>
        {schoolForm.message && (
          <Alert tone={schoolForm.message.tone}>{schoolForm.message.text}</Alert>
        )}
        <SelectField
          label={t('auth.fields.region')}
          placeholder={t('auth.fields.regionPlaceholder')}
          value={sc.regionId}
          onChange={(e) => setSc({ ...sc, regionId: e.target.value })}
          options={regions.map((r) => ({ value: r.id, label: pickName(r, language) }))}
          error={schoolForm.errors.regionId}
        />
        <TextField
          label={t('admin.taxonomy.nameKy')}
          value={sc.nameKy}
          onChange={(e) => setSc({ ...sc, nameKy: e.target.value })}
          error={schoolForm.errors.nameKy}
        />
        <TextField
          label={t('admin.taxonomy.nameRu')}
          value={sc.nameRu}
          onChange={(e) => setSc({ ...sc, nameRu: e.target.value })}
          error={schoolForm.errors.nameRu}
        />
        <TextField
          label={t('admin.taxonomy.district')}
          value={sc.district}
          onChange={(e) => setSc({ ...sc, district: e.target.value })}
        />
        <Button type="submit" loading={schoolForm.busy}>
          {t('admin.taxonomy.add')}
        </Button>
      </form>
    </div>
  );
}
