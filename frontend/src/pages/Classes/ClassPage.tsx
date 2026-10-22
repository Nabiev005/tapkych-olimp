import { ArrowLeft, Check, ClipboardList, Copy, Plus, UserMinus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LevelBadge } from '../../components/olimp/LevelBadge';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { useLanguage } from '../../hooks/useLanguage';
import { ApiError, errorMessage } from '../../services/api';
import { classesApi, type ClassDetail, type ClassStats } from '../../services/classes';
import { formatDate, formatNumber } from '../../utils/format';
import { pickText } from '../../utils/localize';
import './Classes.css';

function CopyCode({ code }: { code: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the code is still visible to copy by hand
    }
  };
  return (
    <div className="join-code">
      <span className="join-code__label">{t('classes.code')}</span>
      <code className="join-code__value">{code}</code>
      <Button variant="secondary" size="sm" onClick={() => void copy()}>
        {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        {copied ? t('classes.copied') : t('classes.copy')}
      </Button>
      <span className="visually-hidden" aria-live="polite">
        {copied ? t('classes.copied') : ''}
      </span>
    </div>
  );
}

export function ClassPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [klass, setKlass] = useState<ClassDetail | null>(null);
  const [stats, setStats] = useState<ClassStats | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    classesApi
      .get(id)
      .then((data) => {
        setKlass(data);
        if (data.isTeacher)
          classesApi
            .stats(id)
            .then(setStats)
            .catch(() => setStats(null));
      })
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err : new ApiError('UNKNOWN', errorMessage(err), null)),
      );
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmRemove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await classesApi.removeMember(id, removing.id);
      setRemoving(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  const confirmLeave = async () => {
    setBusy(true);
    try {
      await classesApi.removeMember(id, 'me');
      navigate('/classes');
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="container page">
        <EmptyState
          as="h1"
          title={error.status === 404 ? t('classes.notFound') : error.message}
          action={<ButtonLink to="/classes">{t('classes.back')}</ButtonLink>}
        />
      </div>
    );
  }
  if (!klass) {
    return (
      <div className="container page">
        <Skeleton height="2em" width="40%" />
        <Skeleton height={200} radius="16px" />
      </div>
    );
  }

  return (
    <div className="container page class-page">
      <Link to="/classes" className="back-link">
        <ArrowLeft size={18} aria-hidden="true" />
        {t('classes.back')}
      </Link>

      <header className="class-header">
        <div>
          <h1 className="page-header__title">{klass.name}</h1>
          <p className="page-header__subtitle">
            {klass.grade ? `${t('auth.fields.gradeOption', { grade: klass.grade })} · ` : ''}
            {t('classes.teacher', { name: klass.teacherName })}
          </p>
        </div>
        {klass.joinCode && <CopyCode code={klass.joinCode} />}
      </header>

      <section className="classes-section" aria-labelledby="assignments-title">
        <div className="section-head">
          <h2 id="assignments-title" className="section-title">
            <ClipboardList size={20} aria-hidden="true" />
            {t('classes.assignments')}
          </h2>
          {klass.isTeacher && (
            <ButtonLink to={`/classes/${klass.id}/assignments/new`} size="sm">
              <Plus size={16} aria-hidden="true" />
              {t('classes.newAssignment')}
            </ButtonLink>
          )}
        </div>
        {klass.assignments.length === 0 ? (
          <p className="dashboard__empty">{t('classes.noAssignments')}</p>
        ) : (
          <ul className="assignment-list">
            {klass.assignments.map((a) => {
              const done = klass.isTeacher
                ? t('classes.completed', {
                    done: a.completedCount ?? 0,
                    total: klass.members.length,
                  })
                : t('classes.mySolved', { solved: a.mySolved ?? 0, total: a.problemCount });
              return (
                <li key={a.id} className="card assignment-item">
                  <Link
                    to={`/classes/${klass.id}/assignments/${a.id}`}
                    className="assignment-item__title"
                  >
                    {pickText(a.titleKy, a.titleRu, language).text}
                  </Link>
                  <span className="assignment-item__meta">
                    {t('classes.problemCount', { count: a.problemCount })} · {done}
                    {a.dueDate &&
                      ` · ${t('classes.due', { date: formatDate(a.dueDate, language) })}`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {klass.isTeacher && (
        <section className="classes-section" aria-labelledby="members-title">
          <h2 id="members-title" className="section-title">
            {t('classes.members', { count: klass.members.length })}
          </h2>
          {klass.members.length === 0 ? (
            <p className="dashboard__empty">{t('classes.noMembers')}</p>
          ) : (
            <div className="table-wrap">
              <table className="leaderboard">
                <thead>
                  <tr>
                    <th scope="col">{t('leaderboard.columns.student')}</th>
                    <th scope="col" className="leaderboard__points">
                      {t('classes.solvedColumn')}
                    </th>
                    <th scope="col" className="leaderboard__points">
                      {t('leaderboard.columns.points')}
                    </th>
                    <th scope="col">
                      <span className="visually-hidden">{t('classes.actions')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {klass.members.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="leaderboard__user">
                          <Link to={`/u/${m.id}`} className="leaderboard__name">
                            {m.fullName}
                          </Link>
                          <span className="leaderboard__sub">
                            <LevelBadge level={m.level} />
                          </span>
                        </div>
                      </td>
                      <td className="leaderboard__points">
                        {formatNumber(m.solvedCount, language)}
                      </td>
                      <td className="leaderboard__points">
                        {formatNumber(m.totalPoints, language)}
                      </td>
                      <td className="class-member__actions">
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={t('classes.remove', { name: m.fullName })}
                          onClick={() => setRemoving({ id: m.id, name: m.fullName })}
                        >
                          <UserMinus size={18} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {klass.isTeacher && stats && stats.problems.length > 0 && (
        <section className="classes-section" aria-labelledby="stats-title">
          <h2 id="stats-title" className="section-title">
            {t('classes.stats.title')}
          </h2>
          <p className="classes-form__hint">{t('classes.stats.hint')}</p>
          <ul className="stats-list">
            {stats.problems.map((p) => (
              <li key={p.problemId} className="stats-row">
                <Link to={`/problems/${p.slug}`} className="stats-row__title">
                  {pickText(p.titleKy, p.titleRu, language).text}
                </Link>
                <div
                  className="progress-bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={p.solvedPercent}
                  aria-label={t('classes.stats.solvedBy', { percent: p.solvedPercent })}
                >
                  <span className="progress-bar__fill" style={{ width: `${p.solvedPercent}%` }} />
                </div>
                <span className="stats-row__value">
                  {t('classes.stats.solvedBy', { percent: p.solvedPercent })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!klass.isTeacher && (
        <div>
          <Button variant="ghost" onClick={() => setLeaving(true)}>
            {t('classes.leave')}
          </Button>
        </div>
      )}

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={t('classes.removeTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              {t('common.actions.cancel')}
            </Button>
            <Button onClick={() => void confirmRemove()} loading={busy}>
              {t('classes.removeConfirm')}
            </Button>
          </>
        }
      >
        <p>{t('classes.removeText', { name: removing?.name ?? '' })}</p>
      </Modal>

      <Modal
        open={leaving}
        onClose={() => setLeaving(false)}
        title={t('classes.leaveTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLeaving(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button onClick={() => void confirmLeave()} loading={busy}>
              {t('classes.leave')}
            </Button>
          </>
        }
      >
        <p>{t('classes.leaveText')}</p>
      </Modal>
    </div>
  );
}
