import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { PasswordField, TextField } from '../../components/ui/Field';
import { useAuth } from '../../hooks/useAuth';
import { ApiError, errorMessage } from '../../services/api';
import { AuthCard } from './AuthCard';
import { safeNext } from './safeNext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export function LoginPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('auth.login.title'));
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      await login(email, password);
      navigate(safeNext(params.get('next')), { replace: true });
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
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      footer={
        <>
          {t('auth.login.noAccount')} <Link to="/register">{t('auth.login.registerLink')}</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <TextField
          label={t('auth.fields.email')}
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />
        <PasswordField
          label={t('auth.fields.password')}
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />
        <div className="auth-form__aside">
          <Link to="/forgot-password">{t('auth.login.forgot')}</Link>
        </div>
        <Button type="submit" size="lg" block loading={submitting}>
          {t('auth.login.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
