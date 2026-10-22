import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { PasswordField } from '../../components/ui/Field';
import { ApiError, errorMessage } from '../../services/api';
import { authApi } from '../../services/auth';

/** Change password (own profile). Other sessions are logged out by the server. */
export function ChangePassword() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    const errors: Record<string, string> = {};
    if (!current) errors.currentPassword = t('auth.validation.required');
    if (next.length < 8) errors.newPassword = t('auth.validation.passwordMin');
    else if (next !== confirm) errors.confirm = t('auth.reset.mismatch');
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      await authApi.changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setMessage({ tone: 'success', text: t('profile.password.changed') });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'WRONG_PASSWORD') {
        setFieldErrors({ currentPassword: err.message });
      } else if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
        setFieldErrors(err.fieldErrors);
      } else {
        setMessage({ tone: 'error', text: errorMessage(err) });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card profile-section" aria-labelledby="password-title">
      <h2 id="password-title" className="section-title">
        {t('profile.password.title')}
      </h2>
      <form className="settings-form" onSubmit={onSubmit} noValidate>
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        <PasswordField
          label={t('profile.password.current')}
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          error={fieldErrors.currentPassword}
        />
        <div className="settings-form__row">
          <PasswordField
            label={t('auth.fields.newPassword')}
            hint={t('auth.fields.passwordHint')}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            error={fieldErrors.newPassword}
          />
          <PasswordField
            label={t('auth.fields.confirmPassword')}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={fieldErrors.confirm}
          />
        </div>
        <Button type="submit" variant="secondary" loading={saving}>
          {t('profile.password.submit')}
        </Button>
      </form>
    </section>
  );
}
