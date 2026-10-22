import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../hooks/useLanguage';
import {
  OLYMPIAD_LEVELS,
  problemsApi,
  type AnswerType,
  type Subject,
} from '../../services/problems';
import { pickName } from '../../utils/localize';
import type { ProblemFormValues } from '../../utils/problemForm';
import { SelectField, TextAreaField, TextField } from '../ui/Field';
import { Tabs } from '../ui/Tabs';
import { MathText } from './MathText';
import './ProblemForm.css';

interface ProblemFormProps {
  values: ProblemFormValues;
  onChange: (values: ProblemFormValues) => void;
  /** Server field errors keyed by path ("titleKy", "choices.0.textKy", ...) */
  errors?: Record<string, string>;
}

const ANSWER_TYPES: AnswerType[] = ['INTEGER', 'DECIMAL', 'TEXT', 'MULTIPLE_CHOICE'];
const LETTERS = 'abcdef';

/** Live KaTeX preview under a textarea */
function Preview({ text }: { text: string }) {
  const { t } = useTranslation();
  if (!text.trim()) return null;
  return (
    <div className="problem-form__preview" aria-label={t('problemForm.preview')}>
      <span className="problem-form__preview-label">{t('problemForm.preview')}</span>
      <MathText>{text}</MathText>
    </div>
  );
}

/** Bilingual problem editor with KaTeX preview (teacher proposals, admin editor). */
export function ProblemForm({ values, onChange, errors = {} }: ProblemFormProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [contentLang, setContentLang] = useState<'ky' | 'ru'>('ky');

  useEffect(() => {
    problemsApi
      .subjects()
      .then(setSubjects)
      .catch(() => setSubjects([]));
  }, []);

  const set = <K extends keyof ProblemFormValues>(key: K, value: ProblemFormValues[K]) =>
    onChange({ ...values, [key]: value });

  const topics = subjects.find((s) => s.slug === values.subjectSlug)?.topics ?? [];
  const suffix = contentLang === 'ky' ? 'Ky' : 'Ru';
  const field = (base: 'title' | 'statement' | 'hint' | 'solution') =>
    `${base}${suffix}` as `${typeof base}${'Ky' | 'Ru'}`;
  const required = contentLang === 'ky';
  const grades = [7, 8, 9, 10, 11].map((g) => ({ value: String(g), label: String(g) }));

  return (
    <div className="problem-form">
      <fieldset className="problem-form__section">
        <legend>{t('problemForm.sections.basics')}</legend>
        <div className="problem-form__grid">
          <SelectField
            label={t('problems.filters.subject')}
            placeholder={t('auth.fields.regionPlaceholder')}
            value={values.subjectSlug}
            onChange={(e) => onChange({ ...values, subjectSlug: e.target.value, topicSlug: '' })}
            options={subjects.map((s) => ({ value: s.slug, label: pickName(s, language) }))}
            error={errors.subjectSlug}
          />
          <SelectField
            label={t('problems.filters.topic')}
            placeholder={t('auth.fields.regionPlaceholder')}
            value={values.topicSlug}
            disabled={!values.subjectSlug}
            onChange={(e) => set('topicSlug', e.target.value)}
            options={topics.map((tp) => ({ value: tp.slug, label: pickName(tp, language) }))}
            error={errors.topicSlug}
          />
          <SelectField
            label={t('problems.filters.difficulty')}
            value={String(values.difficulty)}
            onChange={(e) => set('difficulty', Number(e.target.value))}
            options={[1, 2, 3, 4, 5].map((d) => ({
              value: String(d),
              label: t('problems.difficulty.option', { value: d }),
            }))}
          />
          <SelectField
            label={t('problems.filters.level')}
            value={values.olympiadLevel}
            onChange={(e) =>
              set('olympiadLevel', e.target.value as ProblemFormValues['olympiadLevel'])
            }
            options={OLYMPIAD_LEVELS.map((l) => ({ value: l, label: t(`problems.levels.${l}`) }))}
          />
          <SelectField
            label={t('problemForm.gradeFrom')}
            value={String(values.gradeFrom)}
            onChange={(e) => set('gradeFrom', Number(e.target.value))}
            options={grades}
          />
          <SelectField
            label={t('problemForm.gradeTo')}
            value={String(values.gradeTo)}
            onChange={(e) => set('gradeTo', Number(e.target.value))}
            options={grades}
            error={errors.gradeTo}
          />
          <TextField
            label={t('problemForm.points')}
            type="number"
            min={1}
            max={100}
            value={values.points}
            onChange={(e) => set('points', Number(e.target.value) || 0)}
            error={errors.points}
          />
          <TextField
            label={t('problemForm.source')}
            placeholder={t('problemForm.sourcePlaceholder')}
            value={values.source}
            maxLength={200}
            onChange={(e) => set('source', e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="problem-form__section">
        <legend>{t('problemForm.sections.content')}</legend>
        <p className="problem-form__note">{t('problemForm.formulaHint')}</p>
        <Tabs
          label={t('problemForm.contentLanguage')}
          value={contentLang}
          onChange={setContentLang}
          options={[
            { value: 'ky', label: t('problemForm.langKy') },
            { value: 'ru', label: t('problemForm.langRu') },
          ]}
        />
        <TextField
          label={required ? t('problemForm.titleRequired') : t('problemForm.title')}
          value={values[field('title')]}
          maxLength={200}
          onChange={(e) => set(field('title'), e.target.value)}
          error={errors[field('title')]}
        />
        <TextAreaField
          label={required ? t('problemForm.statementRequired') : t('problemForm.statement')}
          className="textarea--code"
          rows={6}
          value={values[field('statement')]}
          onChange={(e) => set(field('statement'), e.target.value)}
          error={errors[field('statement')]}
        />
        <Preview text={values[field('statement')]} />
        <TextAreaField
          label={t('problemForm.hint')}
          className="textarea--code"
          rows={2}
          value={values[field('hint')]}
          onChange={(e) => set(field('hint'), e.target.value)}
          error={errors[field('hint')]}
        />
        <Preview text={values[field('hint')]} />
        <TextAreaField
          label={required ? t('problemForm.solutionRequired') : t('problemForm.solution')}
          className="textarea--code"
          rows={5}
          value={values[field('solution')]}
          onChange={(e) => set(field('solution'), e.target.value)}
          error={errors[field('solution')]}
        />
        <Preview text={values[field('solution')]} />
      </fieldset>

      <fieldset className="problem-form__section">
        <legend>{t('problemForm.sections.answer')}</legend>
        <div className="problem-form__grid">
          <SelectField
            label={t('problemForm.answerType')}
            value={values.answerType}
            onChange={(e) =>
              onChange({ ...values, answerType: e.target.value as AnswerType, correctAnswer: '' })
            }
            options={ANSWER_TYPES.map((a) => ({
              value: a,
              label: t(`problemForm.answerTypes.${a}`),
            }))}
          />
          {values.answerType === 'DECIMAL' && (
            <TextField
              label={t('problemForm.tolerance')}
              inputMode="decimal"
              value={values.tolerance}
              onChange={(e) => set('tolerance', e.target.value)}
              error={errors.tolerance}
            />
          )}
        </div>

        {values.answerType === 'MULTIPLE_CHOICE' && (
          <div className="choice-editor">
            {values.choices.map((choice, index) => (
              <div key={choice.id} className="choice-editor__row">
                <label className="choice-editor__correct">
                  <input
                    type="radio"
                    name="correct-choice"
                    checked={values.correctAnswer === choice.id}
                    onChange={() => set('correctAnswer', choice.id)}
                  />
                  <span>{choice.id.toUpperCase()}</span>
                  <span className="visually-hidden">{t('problemForm.markCorrect')}</span>
                </label>
                <TextField
                  label={t('problemForm.choiceKy', { id: choice.id.toUpperCase() })}
                  value={choice.textKy}
                  onChange={(e) => {
                    const choices = values.choices.map((c, i) =>
                      i === index ? { ...c, textKy: e.target.value } : c,
                    );
                    set('choices', choices);
                  }}
                  error={errors[`choices.${index}.textKy`]}
                />
                <TextField
                  label={t('problemForm.choiceRu', { id: choice.id.toUpperCase() })}
                  value={choice.textRu}
                  onChange={(e) => {
                    const choices = values.choices.map((c, i) =>
                      i === index ? { ...c, textRu: e.target.value } : c,
                    );
                    set('choices', choices);
                  }}
                />
                <button
                  type="button"
                  className="icon-btn choice-editor__remove"
                  disabled={values.choices.length <= 2}
                  aria-label={t('problemForm.removeChoice', { id: choice.id.toUpperCase() })}
                  onClick={() => {
                    // Re-letter the remaining choices a, b, c...
                    const choices = values.choices
                      .filter((_, i) => i !== index)
                      .map((c, i) => ({ ...c, id: LETTERS[i]! }));
                    onChange({ ...values, choices, correctAnswer: '' });
                  }}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </div>
            ))}
            {values.choices.length < 6 && (
              <button
                type="button"
                className="link-button"
                onClick={() =>
                  set('choices', [
                    ...values.choices,
                    { id: LETTERS[values.choices.length]!, textKy: '', textRu: '' },
                  ])
                }
              >
                <Plus size={16} aria-hidden="true" /> {t('problemForm.addChoice')}
              </button>
            )}
            {(errors.correctAnswer || errors.choices) && (
              <p className="field__error" role="alert">
                {errors.correctAnswer ?? errors.choices}
              </p>
            )}
          </div>
        )}

        {values.answerType === 'TEXT' && (
          <TextAreaField
            label={t('problemForm.correctAnswer')}
            hint={t('problemForm.textAnswersHint')}
            rows={3}
            value={values.correctAnswer}
            onChange={(e) => set('correctAnswer', e.target.value)}
            error={errors.correctAnswer}
          />
        )}
        {(values.answerType === 'INTEGER' || values.answerType === 'DECIMAL') && (
          <TextField
            label={t('problemForm.correctAnswer')}
            hint={t('problemForm.answerSecretHint')}
            inputMode={values.answerType === 'INTEGER' ? 'numeric' : 'decimal'}
            value={values.correctAnswer}
            onChange={(e) => set('correctAnswer', e.target.value)}
            error={errors.correctAnswer}
          />
        )}
      </fieldset>
    </div>
  );
}
