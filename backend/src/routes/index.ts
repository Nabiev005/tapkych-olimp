import { Router } from 'express';
import * as classes from '../controllers/classes.js';
import * as geo from '../controllers/geo.js';
import * as me from '../controllers/me.js';
import * as problems from '../controllers/problems.js';
import * as rating from '../controllers/rating.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/requireRole.js';
import { sendData } from '../utils/response.js';
import { createAuthRouter } from './auth.js';
import { createClassesRouter } from './classes.js';
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
  router.get('/me/dashboard', requireAuth, rating.dashboard);

  router.get('/regions', geo.listRegions);
  router.get('/schools', geo.searchSchools);

  router.get('/subjects', problems.listSubjects);
  router.get('/subjects/:slug/topics', problems.listTopics);
  router.use('/problems', createProblemsRouter());
  router.get('/daily', optionalAuth, rating.daily);

  router.get('/leaderboard', optionalAuth, rating.leaderboard);
  router.get('/leaderboard/schools', rating.schoolLeaderboard);
  router.get('/users/:id', optionalAuth, rating.publicProfile);

  router.use('/classes', createClassesRouter());
  router.get('/proposals', requirePermission('problems:propose'), classes.listMyProposals);
  router.post('/proposals', requirePermission('problems:propose'), classes.createProposal);

  return router;
}
