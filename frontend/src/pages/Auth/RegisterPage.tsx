import { BookOpen, GraduationCap } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { SchoolPicker, type SchoolValue } from '../../components/olimp/SchoolPicker';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { PasswordField, SelectField, TextField } from '../../components/ui/Field';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { ApiError, errorMessage } from '../../services/api';
import { geoApi } from '../../services/auth';
import { localizedName, type Region } from '../../services/types';
import { AuthCard } from './AuthCard';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const GRADES = [7, 8, 9, 10, 11];
type FormRole = 'STUDENT' | 'TEACHER';

export function RegisterPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('auth.register.title'));
  const { language } = useLanguage();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<FormRole>('STUDENT');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [grade, setGrade] = useState('');
  const [regionId, setRegionId] = useState('');
  const [school, setSchool] = useState<SchoolValue>({
    schoolId: null,
    schoolName: '',
    custom: false,
  });
  const [regions, setRegions] = useState<Region[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    geoApi
      .regions()
      .then(setRegions)
      .catch((err: unknown) => setError(errorMessage(err)));
  }, []);

  const required = t('auth.validation.required');

  /** Quick client-side checks; the server validates everything again */
  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (fullName.trim().length < 2) errors.fullName = required;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = t('auth.validation.email');
    if (password.length < 8) errors.password = t('auth.validation.passwordMin');
    if (role === 'STUDENT' && !grade) errors.grade = required;
    if (!regionId) errors.regionId = required;
    if (school.custom ? school.schoolName.trim().length < 2 : !school.schoolId) {
      errors.schoolId = t('auth.validation.school');
    }
    return errors;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role,
        grade: role === 'STUDENT' ? Number(grade) : undefined,
        regionId,
        schoolId: school.custom ? undefined : (school.schoolId ?? undefined),
        customSchoolName: school.custom ? school.schoolName.trim() : undefined,
        language,
      });
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
        const fields = err.fieldErrors;
        setFieldErrors({ ...fields, schoolId: fields.schoolId ?? fields.customSchoolName ?? '' });
      } else if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') {
        setFieldErrors({ email: err.message });
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      footer={
        <>
          {t('auth.register.haveAccount')} <Link to="/login">{t('auth.register.loginLink')}</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {error && <Alert tone="error">{error}</Alert>}

        <fieldset className="role-choice">
          <legend>{t('auth.register.roleLabel')}</legend>
          <label className="role-option">
            <input
              type="radio"
              name="role"
              value="STUDENT"
              checked={role === 'STUDENT'}
              onChange={() => setRole('STUDENT')}
            />
            <span className="role-option__title">
              <BookOpen size={18} aria-hidden="true" />
              {t('auth.register.roleStudent')}
            </span>
            <span className="role-option__hint">{t('auth.register.roleStudentHint')}</span>
          </label>
          <label className="role-option">
            <input
              type="radio"
              name="role"
              value="TEACHER"
              checked={role === 'TEACHER'}
              onChange={() => setRole('TEACHER')}
            />
            <span className="role-option__title">
              <GraduationCap size={18} aria-hidden="true" />
              {t('auth.register.roleTeacher')}
            </span>
            <span className="role-option__hint">{t('auth.register.roleTeacherHint')}</span>
          </label>
        </fieldset>

        <TextField
          label={t('auth.fields.fullName')}
          placeholder={t('auth.fields.fullNamePlaceholder')}
          autoComplete="name"
          required
          maxLength={100}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={fieldErrors.fullName}
        />
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
          hint={t('auth.fields.passwordHint')}
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />

        <div className="auth-form__row">
          <SelectField
            label={t('auth.fields.region')}
            placeholder={t('auth.fields.regionPlaceholder')}
            value={regionId}
            onChange={(e) => {
              setRegionId(e.target.value);
              setSchool({ schoolId: null, schoolName: '', custom: false });
            }}
            options={regions.map((r) => ({ value: r.id, label: localizedName(r, language) }))}
            error={fieldErrors.regionId}
            required
          />
          {role === 'STUDENT' && (
            <SelectField
              label={t('auth.fields.grade')}
              placeholder={t('auth.fields.gradePlaceholder')}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              options={GRADES.map((g) => ({
                value: String(g),
                label: t('auth.fields.gradeOption', { grade: g }),
              }))}
              error={fieldErrors.grade}
              required
            />
          )}
        </div>

        <SchoolPicker
          regionId={regionId}
          value={school}
          onChange={setSchool}
          error={fieldErrors.schoolId || undefined}
        />

        <Button type="submit" size="lg" block loading={submitting}>
          {t('auth.register.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
