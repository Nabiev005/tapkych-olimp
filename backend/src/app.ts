import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { language } from './middleware/language.js';
import { createApiLimiter } from './middleware/rateLimit.js';
import { createApiRouter } from './routes/index.js';
import { createSeoRouter } from './routes/seo.js';
import { getSitemap } from './services/sitemap.js';
import { AppError } from './utils/errors.js';

export function createApp(options: { spaTemplate?: string } = {}) {
  const app = express();

  app.set('trust proxy', 1); // behind Vercel's proxy
  app.disable('x-powered-by');

  app.use(language);
  // Pre-rendered HTML pages: same headers as the static index.html (inline theme script)
  app.use(createSeoRouter(options.spaTemplate));
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin and non-browser requests have no Origin header
        if (!origin || env.CORS_ORIGINS.includes(origin)) callback(null, true);
        else callback(new AppError(403, 'CORS_NOT_ALLOWED'));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Vercel rewrites /sitemap.xml to the function with the original path
  app.get(['/sitemap.xml', '/api/sitemap.xml'], async (_req, res) => {
    res
      .type('application/xml')
      .set('Cache-Control', 'public, max-age=3600')
      .send(await getSitemap());
  });
  app.use('/api', createApiLimiter(), createApiRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;
