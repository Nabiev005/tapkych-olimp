import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { MathText } from '../../components/olimp/MathText';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useLanguage } from '../../hooks/useLanguage';
import { errorMessage } from '../../services/api';
import { assignmentSheet, type AssignmentSheet } from '../../services/classes';
import { formatDateTime } from '../../utils/format';
import { pickText } from '../../utils/localize';
import './Print.css';

/** Teacher's printable worksheet: statements only, with blank answer lines. */
export function AssignmentPrintPage() {
  const { id = '', assignmentId = '' } = useParams();
  const { t } = useTranslation();
  const { language } = useLanguage();
  useDocumentTitle(t('classes.print.title'));
  const [sheet, setSheet] = useState<AssignmentSheet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    assignmentSheet(id, assignmentId)
      .then((data) => !cancelled && setSheet(data))
      .catch((err: unknown) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [id, assignmentId]);

  return (
    <div className="container page print-page">
      <div className="print-toolbar no-print">
        <Link to={`/classes/${id}/assignments/${assignmentId}`} className="back-link">
          <ArrowLeft size={18} aria-hidden="true" />
          {t('classes.backToClass')}
        </Link>
        <p className="print-toolbar__hint">{t('classes.print.hint')}</p>
        <Button onClick={() => window.print()} disabled={!sheet}>
          <Printer size={18} aria-hidden="true" />
          {t('classes.print.print')}
        </Button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {!sheet && !error && <Skeleton height={320} radius="12px" />}

      {sheet && (
        <article className="print-sheet">
          <header className="print-sheet__header">
            <p className="print-sheet__brand">
              {t('common.appName')} · {sheet.class.name}
            </p>
            <h1 className="print-sheet__title">
              {pickText(sheet.titleKy, sheet.titleRu, language).text}
            </h1>
            {sheet.dueDate && (
              <p>{t('classes.due', { date: formatDateTime(sheet.dueDate, language) })}</p>
            )}
            <div className="print-sheet__fields">
              <span>{t('classes.print.student')}: ______________________________</span>
              <span>{t('classes.print.date')}: ____________</span>
            </div>
          </header>

          <ol className="print-sheet__problems">
            {sheet.problems.map((problem, index) => (
              <li key={problem.id} className="print-problem">
                <h2 className="print-problem__title">
                  {t('classes.print.problem', { number: index + 1 })}.{' '}
                  {pickText(problem.titleKy, problem.titleRu, language).text}
                </h2>
                <MathText>
                  {pickText(problem.statementKy, problem.statementRu, language).text}
                </MathText>
                {problem.choices && (
                  <ul className="print-problem__choices">
                    {problem.choices.map((choice) => (
                      <li key={choice.id}>
                        <strong>{choice.id})</strong>{' '}
                        <MathText inline>
                          {pickText(choice.textKy, choice.textRu, language).text}
                        </MathText>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="print-problem__answer">
                  {t('classes.print.answer')}: ______________________
                </p>
              </li>
            ))}
          </ol>
        </article>
      )}
    </div>
  );
}
