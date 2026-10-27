import { ArrowLeft, CheckCircle2, Flag, ListOrdered, PlayCircle, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'react-router-dom';
import { MathText } from '../../components/olimp/MathText';
import { Timer } from '../../components/olimp/Timer';
import { TranslationMissing } from '../../components/olimp/TranslationMissing';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { ApiError, errorMessage } from '../../services/api';
import { contestsApi, type ContestDetail, type ContestProblem } from '../../services/contests';
import { formatDateTime } from '../../utils/format';
import { pickText } from '../../utils/localize';
import { AnswerForm } from '../Problem/AnswerForm';
import './Contests.css';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

function ContestProblemCard({
  problem,
  index,
  canSubmit,
  showVerdicts,
  onSubmit,
}: {
  problem: ContestProblem;
  index: number;
  canSubmit: boolean;
  showVerdicts: boolean;
  onSubmit: (problemId: string, answer: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [saving, setSaving] = useState(false);
  const title = pickText(problem.titleKy, problem.titleRu, language);
  const statement = pickText(problem.statementKy, problem.statementRu, language);

  return (
    <article className="card contest-problem" id={`problem-${index + 1}`}>
      <header className="contest-problem__head">
        <h3 className="contest-problem__title">
          {index + 1}. {title.text}
        </h3>
        <span className="contest-problem__points">
          {t('problems.card.points', { points: problem.points })}
        </span>
        {problem.solved === true && (
          <span className="result result--solved">
            <CheckCircle2 size={18} aria-hidden="true" /> {t('contests.solved')}
          </span>
        )}
        {problem.solved === false && problem.attempts > 0 && (
          <span className="result result--attempted">
            <XCircle size={18} aria-hidden="true" /> {t('contests.notSolved')}
          </span>
        )}
      </header>
      {statement.missing && <TranslationMissing />}
      <MathText>{statement.text}</MathText>

      {canSubmit ? (
        <>
          <AnswerForm
            answerType={problem.answerType}
            choices={problem.choices}
            submitting={saving}
            initialValue={problem.myAnswer ?? ''}
            submitLabel={problem.myAnswer ? t('contests.updateAnswer') : t('contests.saveAnswer')}
            onSubmit={(answer) => {
              setSaving(true);
              void onSubmit(problem.id, answer).finally(() => setSaving(false));
            }}
          />
          <p className="contest-problem__hint">
            {problem.myAnswer
              ? t('contests.savedAnswer', { answer: problem.myAnswer })
              : t('contests.noAnswerYet')}
            {!showVerdicts && ` ${t('contests.lastAnswerCounts')}`}
          </p>
        </>
      ) : (
        problem.myAnswer && (
          <p className="contest-problem__hint">
            {t('contests.savedAnswer', { answer: problem.myAnswer })}
          </p>
        )
      )}

      {problem.slug && (
        <Link to={`/problems/${problem.slug}`} className="contest-problem__link">
          {t('contests.openInCatalog')}
        </Link>
      )}
    </article>
  );
}

export function ContestPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { status: authStatus } = useAuth();
  const location = useLocation();
  const [contest, setContest] = useState<ContestDetail | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<ApiError | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'start' | 'finish' | null>(null);
  useDocumentTitle(contest ? pickText(contest.titleKy, contest.titleRu, language).text : undefined);

  const load = useCallback(async () => {
    try {
      const data = await contestsApi.get(id);
      setOffset(Date.parse(data.serverTime) - Date.now());
      setContest(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('UNKNOWN', errorMessage(err), null));
    }
  }, [id]);

  useEffect(() => {
    if (authStatus === 'loading') return;
    let cancelled = false;
    contestsApi
      .get(id)
      .then((data) => {
        if (cancelled) return;
        setOffset(Date.parse(data.serverTime) - Date.now());
        setContest(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err : new ApiError('UNKNOWN', errorMessage(err), null),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, authStatus]);

  const act = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const submitAnswer = async (problemId: string, answer: string) => {
    setActionError(null);
    setFlash(null);
    try {
      const res = await contestsApi.submit(id, problemId, answer);
      setFlash(
        res.isCorrect === null
          ? t('contests.answerSaved')
          : res.isCorrect
            ? t('contests.answerCorrect')
            : t('contests.answerWrong'),
      );
      await load();
    } catch (err) {
      setActionError(errorMessage(err));
      await load();
    }
  };

  if (error) {
    return (
      <div className="container page">
        <EmptyState
          as="h1"
          title={error.status === 404 ? t('contests.notFound') : error.message}
          action={<ButtonLink to="/contests">{t('contests.back')}</ButtonLink>}
        />
      </div>
    );
  }
  if (!contest) {
    return (
      <div className="container page">
        <Skeleton height="2em" width="50%" />
        <Skeleton height={200} radius="16px" />
      </div>
    );
  }

  const title = pickText(contest.titleKy, contest.titleRu, language);
  const description = pickText(contest.descriptionKy, contest.descriptionRu, language);
  const { me, phase } = contest;
  const signedIn = authStatus === 'authenticated';
  const loginHref = `/login?next=${encodeURIComponent(location.pathname)}`;
  const resultsLink = (
    <ButtonLink to={`/contests/${contest.id}/results`} variant="secondary">
      <ListOrdered size={18} aria-hidden="true" />
      {t('contests.results')}
    </ButtonLink>
  );

  return (
    <div className="container page contest-page">
      <Link to="/contests" className="back-link">
        <ArrowLeft size={18} aria-hidden="true" />
        {t('contests.back')}
      </Link>

      <header className="contest-hero card">
        <div className="contest-hero__badges">
          <Badge tone={phase === 'live' ? 'success' : phase === 'upcoming' ? 'primary' : 'neutral'}>
            {t(`contests.phase.${phase}`)}
          </Badge>
          {contest.class && (
            <Badge tone="accent">{t('contests.classContest', { name: contest.class.name })}</Badge>
          )}
        </div>
        <h1 className="page-header__title">{title.text}</h1>
        <dl className="contest-hero__facts">
          <div>
            <dt>{t('contests.window')}</dt>
            <dd>
              {formatDateTime(contest.startsAt, language)} —{' '}
              {formatDateTime(contest.endsAt, language)}
            </dd>
          </div>
          <div>
            <dt>{t('contests.durationLabel')}</dt>
            <dd>{t('contests.duration', { minutes: contest.durationMinutes })}</dd>
          </div>
          <div>
            <dt>{t('contests.problemsLabel')}</dt>
            <dd>{contest.problemCount}</dd>
          </div>
          <div>
            <dt>{t('contests.participantsLabel')}</dt>
            <dd>{contest.participantCount}</dd>
          </div>
        </dl>
        {description.text && (
          <MathText className="contest-hero__description">{description.text}</MathText>
        )}
        <p className="contest-hero__rules">
          {contest.showVerdicts ? t('contests.rulesShown') : t('contests.rulesHidden')}
        </p>
      </header>

      <div aria-live="polite">
        {actionError && <Alert tone="error">{actionError}</Alert>}
        {flash && <Alert tone="success">{flash}</Alert>}
      </div>

      {/* ----- Upcoming ----- */}
      {phase === 'upcoming' && (
        <section className="card contest-panel">
          <Timer
            target={contest.startsAt}
            offsetMs={offset}
            label={t('contests.startsIn')}
            warnBelowMs={0}
            onDone={() => void load()}
          />
          {!signedIn ? (
            <Alert tone="info">
              {t('contests.loginToJoin')}{' '}
              <Link to={loginHref}>{t('problems.problem.loginLink')}</Link>
            </Alert>
          ) : me.registered ? (
            <p className="contest-panel__ok">
              <CheckCircle2 size={18} aria-hidden="true" /> {t('contests.registeredHint')}
            </p>
          ) : (
            <Button onClick={() => void act(() => contestsApi.register(id))} loading={busy}>
              {t('contests.register')}
            </Button>
          )}
          {contest.canManage && resultsLink}
        </section>
      )}

      {/* ----- Live ----- */}
      {phase === 'live' && (
        <>
          {!signedIn && (
            <Alert tone="info">
              {t('contests.loginToJoin')}{' '}
              <Link to={loginHref}>{t('problems.problem.loginLink')}</Link>
            </Alert>
          )}
          {signedIn && !me.startedAt && (
            <section className="card contest-panel">
              <p>{t('contests.startHint', { minutes: contest.durationMinutes })}</p>
              <Button size="lg" onClick={() => setConfirm('start')}>
                <PlayCircle size={20} aria-hidden="true" />
                {t('contests.start')}
              </Button>
            </section>
          )}
          {me.active && me.deadline && (
            <div className="contest-bar">
              <Timer
                target={me.deadline}
                offsetMs={offset}
                label={t('contests.timeLeft')}
                onDone={() => void load()}
              />
              <Button variant="secondary" size="sm" onClick={() => setConfirm('finish')}>
                <Flag size={16} aria-hidden="true" />
                {t('contests.finish')}
              </Button>
            </div>
          )}
          {me.startedAt && !me.active && <Alert tone="info">{t('contests.yourTimeIsOver')}</Alert>}
          {contest.canManage && resultsLink}
        </>
      )}

      {/* ----- Finished ----- */}
      {phase === 'finished' && (
        <section className="card contest-panel">
          <p>{t('contests.finishedHint')}</p>
          {me.score !== null && (
            <p className="contest-panel__ok">{t('contests.yourScore', { score: me.score })}</p>
          )}
          {resultsLink}
        </section>
      )}

      {contest.problems.length > 0 && (
        <section className="contest-problems" aria-label={t('contests.problemsLabel')}>
          {contest.problems.map((p, index) => (
            <ContestProblemCard
              key={p.id}
              problem={p}
              index={index}
              canSubmit={me.active}
              showVerdicts={contest.showVerdicts}
              onSubmit={submitAnswer}
            />
          ))}
        </section>
      )}

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={
          confirm === 'start' ? t('contests.startConfirmTitle') : t('contests.finishConfirmTitle')
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              loading={busy}
              onClick={() =>
                void act(() =>
                  confirm === 'start' ? contestsApi.start(id) : contestsApi.finish(id),
                )
              }
            >
              {confirm === 'start' ? t('contests.start') : t('contests.finish')}
            </Button>
          </>
        }
      >
        <p>
          {confirm === 'start'
            ? t('contests.startConfirmText', { minutes: contest.durationMinutes })
            : t('contests.finishConfirmText')}
        </p>
      </Modal>
    </div>
  );
}
