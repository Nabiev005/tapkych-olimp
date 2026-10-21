// npm run i18n:check — verifies ky.json and ru.json have the same keys,
// no empty values and the same {{placeholders}}. Exits with 1 on problems.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const localesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'i18n', 'locales');
const LANGS = ['ky', 'ru'];

function flatten(obj, prefix = '', out = new Map()) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') flatten(value, path, out);
    else out.set(path, value);
  }
  return out;
}

const placeholders = (text) =>
  [...String(text).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort();

const dicts = Object.fromEntries(
  LANGS.map((lang) => [
    lang,
    flatten(JSON.parse(readFileSync(join(localesDir, `${lang}.json`), 'utf8'))),
  ]),
);

const problems = [];
const allKeys = new Set(LANGS.flatMap((lang) => [...dicts[lang].keys()]));

for (const key of [...allKeys].sort()) {
  for (const lang of LANGS) {
    const value = dicts[lang].get(key);
    if (value === undefined) problems.push(`[${lang}] missing key: ${key}`);
    else if (typeof value !== 'string') problems.push(`[${lang}] not a string: ${key}`);
    else if (!value.trim()) problems.push(`[${lang}] empty value: ${key}`);
  }
  const [a, b] = LANGS.map((lang) => dicts[lang].get(key));
  if (
    typeof a === 'string' &&
    typeof b === 'string' &&
    placeholders(a).join() !== placeholders(b).join()
  ) {
    problems.push(`placeholders differ: ${key} (ky: ${placeholders(a)}; ru: ${placeholders(b)})`);
  }
}

if (problems.length) {
  console.error(`i18n check failed (${problems.length}):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`i18n check passed: ${allKeys.size} keys in ${LANGS.join(', ')}.`);
