import { GraduationCap, KeyRound, Plus, Users } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { SelectField, TextField } from '../../components/ui/Field';
import { Skeleton } from '../../components/ui/Skeleton';
import { usePermissions } from '../../hooks/usePermissions';
import { ApiError, errorMessage } from '../../services/api';
import { classesApi, type JoinedClass, type TeachingClass } from '../../services/classes';
import './Classes.css';

export function ClassesPage() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [data, setData] = useState<{ teaching: TeachingClass[]; joined: JoinedClass[] } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(() => {
    classesApi
      .list()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err: unknown) => setError(errorMessage(err)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onJoin = async (event: FormEvent) => {
    event.preventDefault();
    setJoining(true);
    setJoinError(null);
    try {
      const klass = await classesApi.join(code.trim());
      navigate(`/classes/${klass.id}`);
    } catch (err) {
      setJoinError(
        err instanceof ApiError && err.code === 'VALIDATION_ERROR'
          ? t('classes.join.invalidFormat')
          : errorMessage(err),
      );
    } finally {
      setJoining(false);
    }
  };

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      setCreateError(t('auth.validation.required'));
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const klass = await classesApi.create(name.trim(), grade ? Number(grade) : null);
      navigate(`/classes/${klass.id}`);
    } catch (err) {
      setCreateError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const isTeacher = can('classes:create');

  return (
    <div className="container page">
      <header className="page-header">
        <h1 className="page-header__title">{t('classes.title')}</h1>
        <p className="page-header__subtitle">
          {isTeacher ? t('classes.subtitleTeacher') : t('classes.subtitleStudent')}
        </p>
      </header>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="classes-actions">
        {isTeacher && (
          <form className="card classes-form" onSubmit={onCreate} noValidate>
            <h2 className="section-title">
              <Plus size={20} aria-hidden="true" />
              {t('classes.create.title')}
            </h2>
            {createError && <Alert tone="error">{createError}</Alert>}
            <TextField
              label={t('classes.create.name')}
              placeholder={t('classes.create.namePlaceholder')}
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
            />
            <SelectField
              label={t('auth.fields.grade')}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              options={[
                { value: '', label: t('classes.create.anyGrade') },
                ...[7, 8, 9, 10, 11].map((g) => ({
                  value: String(g),
                  label: t('auth.fields.gradeOption', { grade: g }),
                })),
              ]}
            />
            <Button type="submit" loading={creating}>
              {t('classes.create.submit')}
            </Button>
          </form>
        )}

        {can('classes:join') && (
          <form className="card classes-form" onSubmit={onJoin} noValidate>
            <h2 className="section-title">
              <KeyRound size={20} aria-hidden="true" />
              {t('classes.join.title')}
            </h2>
            <p className="classes-form__hint">{t('classes.join.hint')}</p>
            {joinError && <Alert tone="error">{joinError}</Alert>}
            <TextField
              label={t('classes.join.code')}
              className="join-code-input"
              value={code}
              maxLength={6}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            />
            <Button
              type="submit"
              variant="secondary"
              loading={joining}
              disabled={code.length !== 6}
            >
              {t('classes.join.submit')}
            </Button>
          </form>
        )}
      </div>

      {!data && !error && <Skeleton height={140} radius="16px" />}

      {data && isTeacher && (
        <section className="classes-section" aria-labelledby="teaching-title">
          <h2 id="teaching-title" className="section-title">
            {t('classes.teaching')}
          </h2>
          {data.teaching.length === 0 ? (
            <p className="dashboard__empty">{t('classes.noTeaching')}</p>
          ) : (
            <ul className="class-grid">
              {data.teaching.map((c) => (
                <li key={c.id} className="card class-card">
                  <Link to={`/classes/${c.id}`} className="class-card__name">
                    {c.name}
                  </Link>
                  <span className="class-card__meta">
                    <Users size={16} aria-hidden="true" />
                    {t('classes.memberCount', { count: c.memberCount })} ·{' '}
                    {t('classes.assignmentCount', { count: c.assignmentCount })}
                  </span>
                  <span className="class-card__code">
                    {t('classes.code')}: <code>{c.joinCode}</code>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {data && (
        <section className="classes-section" aria-labelledby="joined-title">
          <h2 id="joined-title" className="section-title">
            {t('classes.joined')}
          </h2>
          {data.joined.length === 0 ? (
            <EmptyState
              as="h3"
              icon={<GraduationCap size={28} />}
              title={t('classes.noJoined')}
              description={t('classes.noJoinedHint')}
            />
          ) : (
            <ul className="class-grid">
              {data.joined.map((c) => (
                <li key={c.id} className="card class-card">
                  <Link to={`/classes/${c.id}`} className="class-card__name">
                    {c.name}
                  </Link>
                  <span className="class-card__meta">
                    {t('classes.teacher', { name: c.teacherName })}
                  </span>
                  <span className="class-card__meta">
                    {t('classes.assignmentCount', { count: c.assignmentCount })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
