import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { SchoolPicker, type SchoolValue } from '../../components/olimp/SchoolPicker';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { SelectField, TextField } from '../../components/ui/Field';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { ApiError, errorMessage } from '../../services/api';
import { geoApi } from '../../services/auth';
import type { Me, Region } from '../../services/types';
import { pickName } from '../../utils/localize';

function initialSchool(user: Me, language: 'ky' | 'ru'): SchoolValue {
  if (user.school) {
    return { schoolId: user.school.id, schoolName: pickName(user.school, language), custom: false };
  }
  return {
    schoolId: null,
    schoolName: user.customSchoolName ?? '',
    custom: Boolean(user.customSchoolName),
  };
}

/** Own profile settings: name, grade, region/school and privacy. */
export function ProfileSettings({ onSaved }: { onSaved: () => void }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user, updateMe } = useAuth();
  const [regions, setRegions] = useState<Region[]>([]);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [grade, setGrade] = useState(user?.grade ? String(user.grade) : '');
  const [regionId, setRegionId] = useState(user?.regionId ?? '');
  const [school, setSchool] = useState<SchoolValue>(() =>
    user ? initialSchool(user, language) : { schoolId: null, schoolName: '', custom: false },
  );
  const [isPublic, setIsPublic] = useState(user?.isProfilePublic ?? true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    geoApi
      .regions()
      .then(setRegions)
      .catch(() => setRegions([]));
  }, []);

  if (!user) return null;
  const isStudent = user.role === 'STUDENT';

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    const errors: Record<string, string> = {};
    if (fullName.trim().length < 2) errors.fullName = t('auth.validation.required');
    if (school.custom ? school.schoolName.trim().length < 2 : !school.schoolId) {
      errors.schoolId = t('auth.validation.school');
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      await updateMe({
        fullName: fullName.trim(),
        grade: isStudent && grade ? Number(grade) : undefined,
        regionId: regionId || undefined,
        schoolId: school.custom ? null : school.schoolId,
        customSchoolName: school.custom ? school.schoolName.trim() : null,
        isProfilePublic: isPublic,
      });
      setMessage({ tone: 'success', text: t('profile.settings.saved') });
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR')
        setFieldErrors(err.fieldErrors);
      setMessage({ tone: 'error', text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card profile-section" aria-labelledby="settings-title">
      <h2 id="settings-title" className="section-title">
        {t('profile.settings.title')}
      </h2>
      <form className="settings-form" onSubmit={onSubmit} noValidate>
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        <div className="settings-form__row">
          <TextField
            label={t('auth.fields.fullName')}
            value={fullName}
            maxLength={100}
            onChange={(e) => setFullName(e.target.value)}
            error={fieldErrors.fullName}
          />
          <TextField label={t('auth.fields.email')} value={user.email} disabled readOnly />
        </div>
        <div className="settings-form__row">
          <SelectField
            label={t('auth.fields.region')}
            value={regionId}
            onChange={(e) => {
              setRegionId(e.target.value);
              setSchool({ schoolId: null, schoolName: '', custom: false });
            }}
            options={regions.map((r) => ({ value: r.id, label: pickName(r, language) }))}
          />
          {isStudent && (
            <SelectField
              label={t('auth.fields.grade')}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              options={[7, 8, 9, 10, 11].map((g) => ({
                value: String(g),
                label: t('auth.fields.gradeOption', { grade: g }),
              }))}
            />
          )}
        </div>
        <SchoolPicker
          regionId={regionId}
          value={school}
          onChange={setSchool}
          error={fieldErrors.schoolId}
        />
        <label className="toggle">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          <span className="toggle__track" aria-hidden="true" />
          <span>
            <strong>{t('profile.settings.public')}</strong>
            <span className="toggle__hint">{t('profile.settings.publicHint')}</span>
          </span>
        </label>
        <Button type="submit" loading={saving}>
          {t('profile.settings.save')}
        </Button>
      </form>
    </section>
  );
}
