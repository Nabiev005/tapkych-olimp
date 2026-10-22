import { Router } from 'express';
import * as geo from '../controllers/geo.js';
import * as me from '../controllers/me.js';
import * as problems from '../controllers/problems.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/requireRole.js';
import { sendData } from '../utils/response.js';
import { createAuthRouter } from './auth.js';
import { createProblemsRouter } from './problems.js';

// All API routes are mounted under /api in app.ts.
export function createApiRouter(): Router {
  const router = Router();

  router.get('/health', (req, res) => {
    sendData(res, { status: 'ok', lang: req.lang, time: new Date().toISOString() });
  });

  router.use('/auth', createAuthRouter());

  router.get('/me', requireAuth, me.getMe);
  router.patch('/me', requirePermission('profile:update'), me.updateMe);

  router.get('/regions', geo.listRegions);
  router.get('/schools', geo.searchSchools);

  router.get('/subjects', problems.listSubjects);
  router.get('/subjects/:slug/topics', problems.listTopics);
  router.use('/problems', createProblemsRouter());

  return router;
}
