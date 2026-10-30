import { env } from '../config/env.js';
import { LESSONS } from '../content/lessons.js';
import { prisma } from '../db.js';
import { visibleProblemWhere } from './problemQueries.js';

// Pre-rendered HTML for search engines: the SPA template with page-specific meta tags and
// the page text inside #root. React replaces #root on start, so users see the normal app.

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Plain-text description: no formula markup, collapsed spaces, at most `max` chars. */
export function toDescription(text: string, max = 160): string {
  const plain = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$/g, '')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain;
}

export interface PageContent {
  title: string;
  description: string;
  path: string;
  /** HTML built from escaped values */
  body: string;
}

const metaTags: [RegExp, (v: { url: string; title: string; description: string }) => string][] = [
  [/<title>[\s\S]*?<\/title>/, (v) => `<title>${v.title}</title>`],
  [
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    (v) => `<meta name="description" content="${v.description}" />`,
  ],
  [
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    (v) => `<link rel="canonical" href="${v.url}" />`,
  ],
  [
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    (v) => `<meta property="og:url" content="${v.url}" />`,
  ],
  [
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    (v) => `<meta property="og:title" content="${v.title}" />`,
  ],
  [
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    (v) => `<meta property="og:description" content="${v.description}" />`,
  ],
];

export function renderPage(template: string, page: PageContent): string {
  const values = {
    url: escapeHtml(env.APP_URL.replace(/\/$/, '') + page.path),
    title: escapeHtml(page.title),
    description: escapeHtml(page.description),
  };
  // Function replacements: "$" in the values must not be read as a pattern
  let html = template;
  for (const [pattern, build] of metaTags) html = html.replace(pattern, () => build(values));
  return html.replace(
    /<div id="root"><\/div>/,
    () => `<div id="root"><main class="container page seo-page">${page.body}</main></div>`,
  );
}

const APP_NAME = 'Тапкыч Олимп';

const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('');

export async function problemPage(slug: string): Promise<PageContent | null> {
  const problem = await prisma.problem.findFirst({
    where: { AND: [visibleProblemWhere(), { slug }] },
    select: {
      slug: true,
      titleKy: true,
      titleRu: true,
      statementKy: true,
      statementRu: true,
      difficulty: true,
      gradeFrom: true,
      gradeTo: true,
      subject: { select: { nameKy: true } },
      topic: { select: { slug: true, nameKy: true } },
    },
  });
  if (!problem) return null;

  const grades = `${problem.gradeFrom}–${problem.gradeTo}`;
  const ru = problem.statementRu
    ? `<section lang="ru"><h2>${escapeHtml(problem.titleRu ?? problem.titleKy)}</h2>${paragraphs(problem.statementRu)}</section>`
    : '';
  const hasLesson = LESSONS.some((l) => l.slug === problem.topic.slug);
  return {
    title: `${problem.titleKy} — ${problem.subject.nameKy} | ${APP_NAME}`,
    description: toDescription(
      `${problem.subject.nameKy}, ${problem.topic.nameKy}, ${grades}-класс. ${problem.statementKy}`,
    ),
    path: `/problems/${problem.slug}`,
    body: [
      `<p>${escapeHtml(problem.subject.nameKy)} · ${escapeHtml(problem.topic.nameKy)} · ${grades}-класс · ${'★'.repeat(problem.difficulty)}</p>`,
      `<h1>${escapeHtml(problem.titleKy)}</h1>`,
      paragraphs(problem.statementKy),
      ru,
      '<p>',
      hasLesson
        ? `<a href="/theory/${escapeHtml(problem.topic.slug)}">${escapeHtml(problem.topic.nameKy)}: теория</a> · `
        : '',
      '<a href="/problems">Бардык маселелер</a></p>',
    ].join(''),
  };
}

export function theoryIndexPage(): PageContent {
  const items = LESSONS.map(
    (l) =>
      `<li><a href="/theory/${l.slug}">${escapeHtml(l.titleKy)}</a> — ${escapeHtml(l.summaryKy)}</li>`,
  ).join('');
  return {
    title: `Теория — математика, физика, информатика | ${APP_NAME}`,
    description:
      'Олимпиадага даярдануу үчүн кыска сабактар: алгебра, геометрия, сандар теориясы, кинематика, динамика, Ом мыйзамы, алгоритмдер, логика жана графтар.',
    path: '/theory',
    body: `<h1>Теория</h1><ul>${items}</ul>`,
  };
}

export function lessonPage(slug: string): PageContent | null {
  const lesson = LESSONS.find((l) => l.slug === slug);
  if (!lesson) return null;
  const sections = lesson.sections
    .map((s) => `<section><h2>${escapeHtml(s.headingKy)}</h2>${paragraphs(s.bodyKy)}</section>`)
    .join('');
  return {
    title: `${lesson.titleKy} | ${APP_NAME}`,
    description: toDescription(lesson.summaryKy),
    path: `/theory/${lesson.slug}`,
    body: `<h1>${escapeHtml(lesson.titleKy)}</h1><p>${escapeHtml(lesson.summaryKy)}</p>${sections}`,
  };
}
