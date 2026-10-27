import { env } from '../config/env.js';
import { prisma } from '../db.js';
import { TtlCache } from '../utils/cache.js';
import { visibleProblemWhere } from './problemQueries.js';

// sitemap.xml for search engines: public pages, every visible problem and public contests.

const STATIC_PAGES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/problems', priority: '0.9', changefreq: 'daily' },
  { path: '/leaderboard', priority: '0.6', changefreq: 'daily' },
  { path: '/contests', priority: '0.7', changefreq: 'daily' },
  { path: '/register', priority: '0.5', changefreq: 'monthly' },
] as const;

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const cache = new TtlCache<string>(60 * 60 * 1000, 1);

export function getSitemap(): Promise<string> {
  return cache.get('sitemap', async () => {
    const base = env.APP_URL.replace(/\/$/, '');
    const [problems, contests] = await Promise.all([
      prisma.problem.findMany({
        where: visibleProblemWhere(),
        select: { slug: true, updatedAt: true },
        orderBy: { publishedAt: 'desc' },
        take: 5000,
      }),
      prisma.contest.findMany({
        where: { status: 'PUBLISHED', isPublic: true, classId: null },
        select: { id: true, updatedAt: true },
        take: 1000,
      }),
    ]);

    const url = (path: string, extra: string) =>
      `  <url><loc>${escapeXml(base + path)}</loc>${extra}</url>`;
    const lines = [
      ...STATIC_PAGES.map((p) =>
        url(p.path, `<changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority>`),
      ),
      ...problems.map((p) =>
        url(
          `/problems/${p.slug}`,
          `<lastmod>${p.updatedAt.toISOString().slice(0, 10)}</lastmod><priority>0.8</priority>`,
        ),
      ),
      ...contests.map((c) =>
        url(`/contests/${c.id}`, `<lastmod>${c.updatedAt.toISOString().slice(0, 10)}</lastmod>`),
      ),
    ];
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join('\n')}\n</urlset>\n`;
  });
}
