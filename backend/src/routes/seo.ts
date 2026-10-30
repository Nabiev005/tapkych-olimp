import { Router, type Response } from 'express';
import {
  lessonPage,
  problemPage,
  renderPage,
  theoryIndexPage,
  type PageContent,
} from '../services/seoPages.js';
import defaultTemplate from '../spaTemplate.js';

// Vercel rewrites these SPA paths to the function (original path kept), so crawlers get
// the page text in the HTML. Without a built template (dev, tests) the router is a no-op.
export function createSeoRouter(template: string = defaultTemplate): Router {
  const router = Router();
  if (!template) return router;

  const send = (res: Response, page: PageContent | null) => {
    res
      .status(page ? 200 : 404)
      .type('html')
      .set('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400')
      .send(page ? renderPage(template, page) : template);
  };

  router.get('/problems/:slug', async (req, res) => send(res, await problemPage(req.params.slug)));
  router.get('/theory', (_req, res) => send(res, theoryIndexPage()));
  router.get('/theory/:slug', (req, res) => send(res, lessonPage(req.params.slug)));
  return router;
}
