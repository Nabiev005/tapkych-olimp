import { randomBytes } from 'node:crypto';

// Kyrgyz/Russian Cyrillic → Latin for URL slugs
const MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'j',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  ң: 'ng',
  о: 'o',
  ө: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ү: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  '№': '',
};

export function slugify(text: string, maxLength = 60): string {
  const latin = [...text.toLowerCase()].map((ch) => MAP[ch] ?? ch).join('');
  return latin
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

/** Slug with a short random suffix, so equal titles never collide */
export function uniqueSlug(text: string): string {
  const base = slugify(text) || 'problem';
  return `${base}-${randomBytes(3).toString('hex')}`;
}
