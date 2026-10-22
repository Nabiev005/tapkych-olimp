import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button, ButtonLink } from '../../components/ui/Button';
import { PasswordField } from '../../components/ui/Field';
import { ApiError, errorMessage } from '../../services/api';
import { authApi } from '../../services/auth';
import { AuthCard } from './AuthCard';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setFieldErrors({ password: t('auth.validation.passwordMin') });
      return;
    }
    if (password !== confirm) {
      setFieldErrors({ confirm: t('auth.reset.mismatch') });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
        setFieldErrors(err.fieldErrors);
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title={t('auth.reset.title')}
      footer={<Link to="/forgot-password">{t('auth.reset.requestNew')}</Link>}
    >
      {!token ? (
        <div className="auth-form">
          <Alert tone="error">{t('auth.reset.missingToken')}</Alert>
        </div>
      ) : done ? (
        <div className="auth-form">
          <Alert tone="success">{t('auth.reset.success')}</Alert>
          <ButtonLink to="/login" size="lg" block>
            {t('auth.login.submit')}
          </ButtonLink>
        </div>
      ) : (
        <form className="auth-form" onSubmit={onSubmit} noValidate>
          {error && <Alert tone="error">{error}</Alert>}
          <PasswordField
            label={t('auth.fields.newPassword')}
            hint={t('auth.fields.passwordHint')}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
          />
          <PasswordField
            label={t('auth.fields.confirmPassword')}
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={fieldErrors.confirm}
          />
          <Button type="submit" size="lg" block loading={submitting}>
            {t('auth.reset.submit')}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
