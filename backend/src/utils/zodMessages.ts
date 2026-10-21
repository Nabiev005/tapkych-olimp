import type { ZodError } from 'zod';
import { hasMessage, t, type Lang } from '../i18n/index.js';

type Issue = ZodError['issues'][number];

export interface FieldError {
  path: string;
  message: string;
}

/**
 * Translates a Zod issue. Custom refinements may pass an i18n key as their
 * message (e.g. "validation.passwordsMismatch") — it is translated too.
 * `input` is the validated object, used to detect missing (required) fields.
 */
export function translateIssue(issue: Issue, lang: Lang, input?: unknown): string {
  switch (issue.code) {
    case 'invalid_type':
      return valueAt(input, issue.path) === undefined
        ? t(lang, 'validation.required')
        : t(lang, 'validation.invalidType');
    case 'too_small': {
      const min = Number(issue.minimum);
      if (issue.origin === 'string') {
        return min <= 1
          ? t(lang, 'validation.required')
          : t(lang, 'validation.stringTooShort', { min });
      }
      if (issue.origin === 'array') return t(lang, 'validation.arrayTooShort', { min });
      return t(lang, 'validation.numberTooSmall', { min });
    }
    case 'too_big': {
      const max = Number(issue.maximum);
      if (issue.origin === 'string') return t(lang, 'validation.stringTooLong', { max });
      if (issue.origin === 'array') return t(lang, 'validation.arrayTooBig', { max });
      return t(lang, 'validation.numberTooBig', { max });
    }
    case 'invalid_format':
      return issue.format === 'email'
        ? t(lang, 'validation.invalidEmail')
        : t(lang, 'validation.invalidFormat');
    case 'invalid_value':
      return t(lang, 'validation.invalidOption');
    case 'unrecognized_keys':
      return t(lang, 'validation.unknownKeys');
    default:
      return hasMessage(issue.message)
        ? t(lang, issue.message)
        : t(lang, 'validation.invalidFormat');
  }
}

export function translateZodError(error: ZodError, lang: Lang, input?: unknown): FieldError[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: translateIssue(issue, lang, input),
  }));
}

function valueAt(input: unknown, path: readonly PropertyKey[]): unknown {
  let node: unknown = input;
  for (const key of path) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<PropertyKey, unknown>)[key];
  }
  return node;
}
