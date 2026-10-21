import { ky } from './ky.js';
import { ru } from './ru.js';

export type Lang = 'ky' | 'ru';
export const SUPPORTED_LANGS: readonly Lang[] = ['ky', 'ru'];
export const DEFAULT_LANG: Lang = 'ky';

type DeepStrings<T> = { readonly [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]> };
export type Messages = DeepStrings<typeof ky>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];
export type MessageKey = Paths<Messages>;

const dictionaries: Record<Lang, Messages> = { ky, ru };

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(value);
}

function lookup(dict: Messages, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export function hasMessage(key: string): key is MessageKey {
  return lookup(ky, key) !== undefined;
}

/** Translates a key; falls back to Kyrgyz, then to the key itself. */
export function t(
  lang: Lang,
  key: MessageKey,
  params: Record<string, string | number> = {},
): string {
  const template = lookup(dictionaries[lang], key) ?? lookup(ky, key) ?? key;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(params[name] ?? ''));
}
