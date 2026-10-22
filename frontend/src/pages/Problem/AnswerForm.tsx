import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { MathText } from '../../components/olimp/MathText';
import { Button } from '../../components/ui/Button';
import { useLanguage } from '../../hooks/useLanguage';
import type { AnswerType, Choice } from '../../services/problems';
import { pickText } from '../../utils/localize';

interface AnswerFormProps {
  answerType: AnswerType;
  choices: Choice[] | null;
  submitting: boolean;
  onSubmit: (answer: string) => void;
}

/** Answer input matching the answer type: integer, decimal, text or choices. */
export function AnswerForm({ answerType, choices, submitting, onSubmit }: AnswerFormProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [value, setValue] = useState('');
  const id = useId();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (value.trim()) onSubmit(value.trim());
  };

  if (answerType === 'MULTIPLE_CHOICE') {
    return (
      <form className="answer-form" onSubmit={handleSubmit}>
        <fieldset className="choices">
          <legend className="answer-form__label">{t('problems.problem.chooseOption')}</legend>
          {(choices ?? []).map((choice) => {
            const text = pickText(choice.textKy, choice.textRu, language);
            return (
              <label key={choice.id} className="choice">
                <input
                  type="radio"
                  name={`${id}-choice`}
                  value={choice.id}
                  checked={value === choice.id}
                  onChange={() => setValue(choice.id)}
                />
                <span className="choice__marker" aria-hidden="true">
                  {choice.id.toUpperCase()}
                </span>
                <MathText inline>{text.text}</MathText>
              </label>
            );
          })}
        </fieldset>
        <Button type="submit" size="lg" loading={submitting} disabled={!value}>
          {t('problems.problem.check')}
        </Button>
      </form>
    );
  }

  const inputProps =
    answerType === 'INTEGER'
      ? { inputMode: 'numeric' as const, placeholder: t('problems.problem.placeholderInteger') }
      : answerType === 'DECIMAL'
        ? { inputMode: 'decimal' as const, placeholder: t('problems.problem.placeholderDecimal') }
        : { inputMode: 'text' as const, placeholder: t('problems.problem.placeholderText') };

  return (
    <form className="answer-form" onSubmit={handleSubmit}>
      <label className="answer-form__label" htmlFor={id}>
        {t('problems.problem.answer')}
      </label>
      <div className="answer-form__row">
        <input
          id={id}
          className="input answer-form__input"
          autoComplete="off"
          spellCheck={false}
          maxLength={200}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          {...inputProps}
        />
        <Button type="submit" size="lg" loading={submitting} disabled={!value.trim()}>
          {t('problems.problem.check')}
        </Button>
      </div>
    </form>
  );
}
