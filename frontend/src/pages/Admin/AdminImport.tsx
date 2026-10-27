import { FileUp } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextAreaField } from '../../components/ui/Field';
import { adminApi, type ImportReport } from '../../services/admin';
import { errorMessage } from '../../services/api';

/** Bulk import from JSON (format: docs/problem-format.md), with a dry run first. */
export function AdminImport() {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parse = (): unknown[] | null => {
    try {
      const json: unknown = JSON.parse(text);
      const items = Array.isArray(json) ? json : (json as { problems?: unknown }).problems;
      if (!Array.isArray(items)) throw new Error('shape');
      return items;
    } catch {
      setError(t('admin.import.invalidJson'));
      return null;
    }
  };

  const run = async (dryRun: boolean) => {
    setError(null);
    setReport(null);
    const items = parse();
    if (!items) return;
    setBusy(true);
    try {
      setReport(await adminApi.importProblems(items, dryRun));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setText(await file.text());
  };

  return (
    <div className="admin-section-wrap">
      <p className="admin-note">
        {t('admin.import.hint')} <Link to="/admin/problems">{t('admin.nav.problems')}</Link>
      </p>
      <section className="card admin-section admin-import">
        <label className="btn btn--secondary admin-import__file">
          <FileUp size={18} aria-hidden="true" />
          {t('admin.import.chooseFile')}
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => void onFile(e)}
            className="visually-hidden"
          />
        </label>
        <TextAreaField
          label={t('admin.import.json')}
          className="textarea--code"
          rows={12}
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
        />
        <div className="admin-editor__actions">
          <Button
            variant="secondary"
            onClick={() => void run(true)}
            loading={busy}
            disabled={!text.trim()}
          >
            {t('admin.import.check')}
          </Button>
          <Button onClick={() => void run(false)} loading={busy} disabled={!text.trim()}>
            {t('admin.import.run')}
          </Button>
        </div>
      </section>

      <div aria-live="polite">
        {error && <Alert tone="error">{error}</Alert>}
        {report && (
          <section className="card admin-section">
            <Alert tone={report.invalid > 0 ? 'error' : 'success'}>
              {report.dryRun ? `${t('admin.import.dryRun')} ` : ''}
              {t('admin.import.summary', {
                created: report.created,
                updated: report.updated,
                invalid: report.invalid,
              })}
            </Alert>
            <ol className="import-results">
              {report.results.map((r) => (
                <li key={r.index} className={`import-result import-result--${r.action}`}>
                  <strong>
                    #{r.index + 1} {r.titleKy ?? '—'}
                  </strong>{' '}
                  <span>{t(`admin.import.action.${r.action}`)}</span>
                  {r.slug && <code> {r.slug}</code>}
                  {r.errors && (
                    <ul>
                      {r.errors.map((e, i) => (
                        <li key={i}>
                          <code>{e.path}</code>: {e.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}
