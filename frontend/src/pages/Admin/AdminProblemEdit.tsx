import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ProblemForm } from '../../components/olimp/ProblemForm';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { adminApi, type AdminProblem, type ProblemStatus } from '../../services/admin';
import { ApiError, errorMessage } from '../../services/api';
import {
  EMPTY_PROBLEM,
  fromProblemPayload,
  toProblemPayload,
  type ProblemFormValues,
} from '../../utils/problemForm';

function toFormValues(p: AdminProblem): ProblemFormValues {
  return fromProblemPayload({
    subjectSlug: p.subject.slug,
    topicSlug: p.topic.slug,
    titleKy: p.titleKy,
    titleRu: p.titleRu,
    statementKy: p.statementKy,
    statementRu: p.statementRu,
    answerType: p.answerType,
    correctAnswer: p.correctAnswer,
    tolerance: p.tolerance,
    choices: p.choices,
    solutionKy: p.solutionKy,
    solutionRu: p.solutionRu,
    hintKy: p.hintKy,
    hintRu: p.hintRu,
    difficulty: p.difficulty,
    olympiadLevel: p.olympiadLevel,
    gradeFrom: p.gradeFrom,
    gradeTo: p.gradeTo,
    points: p.points,
    source: p.source,
  });
}

/** Create (/admin/problems/new) or edit (/admin/problems/:id) a problem. */
export function AdminProblemEdit() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [values, setValues] = useState<ProblemFormValues>(EMPTY_PROBLEM);
  const [problem, setProblem] = useState<AdminProblem | null>(null);
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState<ProblemStatus>('DRAFT');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testValue, setTestValue] = useState('');
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    adminApi
      .problem(id)
      .then((p) => {
        if (cancelled) return;
        setProblem(p);
        setValues(toFormValues(p));
        setSlug(p.slug);
        setStatus(p.status);
        setNote(p.reviewNote ?? '');
      })
      .catch((err: unknown) => !cancelled && setMessage({ tone: 'error', text: errorMessage(err) }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setErrors({});
    const payload = { ...toProblemPayload(values), slug: slug.trim() || undefined, status };
    try {
      const saved = isNew
        ? await adminApi.createProblem(payload)
        : await adminApi.updateProblem(id, payload);
      setSlug(saved.slug);
      setMessage({ tone: 'success', text: t('admin.editor.saved') });
      if (isNew) navigate(`/admin/problems/${saved.id}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') setErrors(err.fieldErrors);
      setMessage({ tone: 'error', text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    const payload = toProblemPayload(values);
    try {
      const res = await adminApi.checkAnswer({
        answerType: payload.answerType,
        correctAnswer: payload.correctAnswer,
        tolerance: payload.tolerance,
        answer: testValue,
      });
      setTestResult(res.isCorrect);
    } catch (err) {
      setMessage({ tone: 'error', text: errorMessage(err) });
    }
  };

  const reject = async () => {
    if (!problem) return;
    setSaving(true);
    try {
      await adminApi.setStatus(problem.id, 'ARCHIVED', note.trim() || null);
      setStatus('ARCHIVED');
      setRejecting(false);
      setMessage({ tone: 'success', text: t('admin.editor.rejected') });
    } catch (err) {
      setMessage({ tone: 'error', text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton height={320} radius="16px" />;
  const isProposal = problem?.author?.role === 'TEACHER';

  return (
    <form className="admin-editor" onSubmit={save} noValidate>
      <Link to={isProposal ? '/admin/proposals' : '/admin/problems'} className="back-link">
        <ArrowLeft size={18} aria-hidden="true" />
        {isProposal ? t('admin.nav.proposals') : t('admin.nav.problems')}
      </Link>
      <h2 className="page-header__title">
        {isNew ? t('admin.editor.newTitle') : t('admin.editor.editTitle')}
      </h2>
      {problem?.author && (
        <p className="admin-note">
          {t('admin.editor.author', {
            name: problem.author.fullName,
            role: t(`auth.roles.${problem.author.role}`),
          })}
        </p>
      )}
      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <div className="card admin-meta">
        <TextField
          label={t('admin.editor.slug')}
          hint={t('admin.editor.slugHint')}
          value={slug}
          maxLength={120}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
          error={errors.slug}
        />
        <SelectField
          label={t('admin.problems.status')}
          value={status}
          onChange={(e) => setStatus(e.target.value as ProblemStatus)}
          options={(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const).map((s) => ({
            value: s,
            label: t(`admin.status.${s}`),
          }))}
        />
      </div>

      <ProblemForm values={values} onChange={setValues} errors={errors} />

      <section className="card admin-test" aria-labelledby="test-title">
        <h3 id="test-title" className="section-title">
          {t('admin.editor.testTitle')}
        </h3>
        <p className="admin-note">{t('admin.editor.testHint')}</p>
        <div className="admin-test__row">
          <TextField
            label={t('admin.editor.testAnswer')}
            value={testValue}
            onChange={(e) => {
              setTestValue(e.target.value);
              setTestResult(null);
            }}
          />
          <Button variant="secondary" onClick={() => void runTest()} disabled={!testValue.trim()}>
            {t('admin.editor.testRun')}
          </Button>
        </div>
        <div aria-live="polite">
          {testResult === true && (
            <p className="result result--solved">
              <CheckCircle2 size={18} aria-hidden="true" /> {t('admin.editor.testCorrect')}
            </p>
          )}
          {testResult === false && (
            <p className="result result--attempted">
              <XCircle size={18} aria-hidden="true" /> {t('admin.editor.testWrong')}
            </p>
          )}
        </div>
      </section>

      <div className="admin-editor__actions">
        <Button type="submit" size="lg" loading={saving}>
          {t('admin.editor.save')}
        </Button>
        {isProposal && status === 'DRAFT' && (
          <Button variant="secondary" size="lg" onClick={() => setRejecting(true)}>
            {t('admin.proposals.reject')}
          </Button>
        )}
      </div>

      <Modal
        open={rejecting}
        onClose={() => setRejecting(false)}
        title={t('admin.proposals.rejectTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button onClick={() => void reject()} loading={saving}>
              {t('admin.proposals.reject')}
            </Button>
          </>
        }
      >
        <TextAreaField
          label={t('admin.proposals.note')}
          hint={t('admin.proposals.noteHint')}
          rows={3}
          value={note}
          maxLength={1000}
          onChange={(e) => setNote(e.target.value)}
        />
      </Modal>
    </form>
  );
}
