import { ArrowLeft, BookOpenCheck, CheckCircle2, Lightbulb, Lock, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CelebrationModal, type Celebration } from '../../components/olimp/CelebrationModal';
import { DifficultyStars } from '../../components/olimp/DifficultyStars';
import { MathText } from '../../components/olimp/MathText';
import { OlympiadBadge } from '../../components/olimp/OlympiadBadge';
import { ProblemCard } from '../../components/olimp/ProblemCard';
import { TranslationMissing } from '../../components/olimp/TranslationMissing';
import { Alert } from '../../components/ui/Alert';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { ApiError, errorMessage } from '../../services/api';
import {
  problemsApi,
  type LocalizedText,
  type ProblemDetail,
  type SubmitResult,
} from '../../services/problems';
import { formatDateTime } from '../../utils/format';
import { pickName, pickText } from '../../utils/localize';
import { AnswerForm } from './AnswerForm';
import './ProblemPage.css';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

type Confirm = 'hint' | 'solution' | null;

function LocalizedBlock({ value }: { value: LocalizedText }) {
  const { language } = useLanguage();
  const text = pickText(value.ky, value.ru, language);
  return (
    <>
      {text.missing && <TranslationMissing />}
      <MathText>{text.text}</MathText>
    </>
  );
}

/** Remounts per slug so that all page state resets when navigating between problems */
export function ProblemPage() {
  const { slug = '' } = useParams();
  return <ProblemView key={slug} slug={slug} />;
}

function ProblemView({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { status: authStatus, reloadUser } = useAuth();
  const location = useLocation();

  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [opening, setOpening] = useState(false);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  useDocumentTitle(problem ? pickText(problem.titleKy, problem.titleRu, language).text : undefined);

  const load = useCallback(async () => {
    try {
      setProblem(await problemsApi.get(slug));
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err : new ApiError('UNKNOWN', errorMessage(err), null),
      );
    }
  }, [slug]);

  // Initial load (waits for the session so progress is included)
  useEffect(() => {
    if (authStatus === 'loading') return;
    let cancelled = false;
    problemsApi
      .get(slug)
      .then((data) => {
        if (!cancelled) setProblem(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof ApiError ? err : new ApiError('UNKNOWN', errorMessage(err), null),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug, authStatus]);

  const submit = async (answer: string) => {
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await problemsApi.submit(slug, answer);
      setResult(res);
      await load();
      if (res.pointsAwarded > 0) void reloadUser();
      if (res.leveledUp || res.achievements.length > 0) {
        setCelebration({
          newLevel: res.leveledUp ? res.level : null,
          achievements: res.achievements,
        });
      }
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const openConfirmed = async () => {
    if (!confirm) return;
    setOpening(true);
    setActionError(null);
    try {
      if (confirm === 'hint') await problemsApi.openHint(slug);
      else await problemsApi.openSolution(slug);
      await load();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setOpening(false);
      setConfirm(null);
    }
  };

  // After solving there is nothing to lose: open without asking
  const openNow = async (kind: 'hint' | 'solution') => {
    setActionError(null);
    try {
      if (kind === 'hint') await problemsApi.openHint(slug);
      else await problemsApi.openSolution(slug);
      await load();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  if (loadError) {
    return (
      <div className="container page">
        <EmptyState
          as="h1"
          title={loadError.status === 404 ? t('problems.problem.notFound') : t('errors.generic')}
          description={loadError.status === 404 ? undefined : loadError.message}
          action={<ButtonLink to="/problems">{t('problems.problem.back')}</ButtonLink>}
        />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="container page problem-page" aria-busy="true">
        <Skeleton width="30%" />
        <Skeleton height="2em" width="70%" />
        <div className="card problem-statement">
          <Skeleton />
          <Skeleton />
          <Skeleton width="60%" />
        </div>
      </div>
    );
  }

  const title = pickText(problem.titleKy, problem.titleRu, language);
  const statement = pickText(problem.statementKy, problem.statementRu, language);
  const solved = problem.progress?.status === 'SOLVED';
  const attempts = problem.progress?.attempts ?? 0;
  const attemptsLeft = Math.max(0, problem.solutionUnlockAttempts - attempts);
  const signedIn = authStatus === 'authenticated';
  const loginHref = `/login?next=${encodeURIComponent(location.pathname)}`;

  return (
    <div className="container page problem-page">
      <Link to="/problems" className="back-link">
        <ArrowLeft size={18} aria-hidden="true" />
        {t('problems.problem.back')}
      </Link>

      <header className="problem-header">
        <p className="problem-header__crumbs">
          {pickName(problem.subject, language)} · {pickName(problem.topic, language)}
        </p>
        <h1 className="problem-header__title">
          {title.text}
          {solved && (
            <span className="problem-header__solved">
              <CheckCircle2 size={22} aria-hidden="true" />
              {t('problems.problem.solvedBadge')}
            </span>
          )}
        </h1>
        <div className="problem-header__meta">
          <DifficultyStars value={problem.difficulty} />
          <OlympiadBadge level={problem.olympiadLevel} />
          <span>{t('problems.card.grades', { from: problem.gradeFrom, to: problem.gradeTo })}</span>
          <span className="problem-header__points">
            {t('problems.problem.maxPoints', { points: problem.maxPoints })}
          </span>
        </div>
      </header>

      <div className="problem-layout">
        <div className="problem-main">
          <section className="card problem-statement" aria-labelledby="statement-title">
            <h2 id="statement-title" className="section-title">
              {t('problems.problem.statement')}
            </h2>
            {statement.missing && <TranslationMissing />}
            <MathText>{statement.text}</MathText>
            {problem.source && (
              <p className="problem-statement__source">
                {t('problems.problem.source', { source: problem.source })}
              </p>
            )}
          </section>

          <section className="card problem-answer" aria-label={t('problems.problem.answer')}>
            {signedIn ? (
              <AnswerForm
                key={problem.id}
                answerType={problem.answerType}
                choices={problem.choices}
                submitting={submitting}
                onSubmit={(answer) => void submit(answer)}
              />
            ) : (
              <Alert tone="info">
                {t('problems.problem.loginToSubmit')}{' '}
                <Link to={loginHref}>{t('problems.problem.loginLink')}</Link>
              </Alert>
            )}

            <div aria-live="polite" className="problem-answer__feedback">
              {actionError && <Alert tone="error">{actionError}</Alert>}
              {result && <Feedback result={result} />}
            </div>
          </section>

          {signedIn && (
            <section className="problem-help">
              {problem.hasHint && (
                <div className="card help-card">
                  <h2 className="section-title">
                    <Lightbulb size={20} aria-hidden="true" />
                    {t('problems.problem.hint')}
                  </h2>
                  {problem.hint ? (
                    <LocalizedBlock value={problem.hint} />
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => (solved ? void openNow('hint') : setConfirm('hint'))}
                    >
                      {t('problems.problem.showHint')}
                    </Button>
                  )}
                </div>
              )}

              <div className="card help-card">
                <h2 className="section-title">
                  <BookOpenCheck size={20} aria-hidden="true" />
                  {t('problems.problem.solution')}
                </h2>
                {problem.solution ? (
                  <LocalizedBlock value={problem.solution} />
                ) : problem.canOpenSolution ? (
                  <Button
                    variant="secondary"
                    onClick={() => (solved ? void openNow('solution') : setConfirm('solution'))}
                  >
                    {t('problems.problem.showSolution')}
                  </Button>
                ) : (
                  <p className="help-card__locked">
                    <Lock size={16} aria-hidden="true" />
                    {t('problems.problem.solutionLocked', {
                      count: problem.solutionUnlockAttempts,
                    })}{' '}
                    {t('problems.problem.solutionAttemptsLeft', { count: attemptsLeft })}
                  </p>
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="problem-aside">
          {signedIn && (
            <section className="card aside-card" aria-labelledby="attempts-title">
              <h2 id="attempts-title" className="section-title">
                {t('problems.problem.attempts')}
              </h2>
              {problem.submissions.length === 0 ? (
                <p className="aside-card__empty">{t('problems.problem.noAttempts')}</p>
              ) : (
                <ol className="attempts">
                  {problem.submissions.map((s) => (
                    <li key={s.id} className={`attempt${s.isCorrect ? ' is-correct' : ''}`}>
                      {s.isCorrect ? (
                        <CheckCircle2 size={16} aria-label={t('problems.problem.attemptCorrect')} />
                      ) : (
                        <XCircle size={16} aria-label={t('problems.problem.attemptWrong')} />
                      )}
                      <code className="attempt__answer">{s.answer}</code>
                      <time className="attempt__time" dateTime={s.createdAt}>
                        {formatDateTime(s.createdAt, language)}
                      </time>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          {problem.similar.length > 0 && (
            <section aria-labelledby="similar-title">
              <h2 id="similar-title" className="section-title">
                {t('problems.problem.similar')}
              </h2>
              <ul className="similar-list">
                {problem.similar.map((p) => (
                  <li key={p.id}>
                    <ProblemCard problem={p} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        icon={confirm === 'hint' ? <Lightbulb size={30} /> : <BookOpenCheck size={30} />}
        title={
          confirm === 'hint'
            ? t('problems.problem.hintConfirmTitle')
            : t('problems.problem.solutionConfirmTitle')
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              {t('common.actions.cancel')}
            </Button>
            <Button onClick={() => void openConfirmed()} loading={opening}>
              {t('problems.problem.open')}
            </Button>
          </>
        }
      >
        <p>
          {confirm === 'hint'
            ? t('problems.problem.hintConfirmText')
            : t('problems.problem.solutionConfirmText')}
        </p>
      </Modal>

      <CelebrationModal celebration={celebration} onClose={() => setCelebration(null)} />
    </div>
  );
}

function Feedback({ result }: { result: SubmitResult }) {
  const { t } = useTranslation();
  if (!result.isCorrect) {
    return (
      <div className="feedback feedback--wrong" role="status">
        <XCircle size={24} aria-hidden="true" />
        <span>{t('problems.problem.wrong')}</span>
      </div>
    );
  }
  const message = result.alreadySolved
    ? t('problems.problem.alreadySolved')
    : result.pointsAwarded === 0
      ? t('problems.problem.solvedNoPoints')
      : t('problems.problem.correct');
  return (
    <div className="feedback feedback--correct" role="status">
      <CheckCircle2 size={24} aria-hidden="true" />
      <span>
        {message}
        {result.pointsAwarded > 0 && (
          <strong className="feedback__points">
            {' '}
            {t('problems.problem.correctPoints', { points: result.pointsAwarded })}
          </strong>
        )}
        {result.dailyBonus > 0 && (
          <span className="feedback__bonus">
            {' '}
            {t('problems.problem.dailyBonus', { bonus: result.dailyBonus })}
          </span>
        )}
      </span>
    </div>
  );
}
