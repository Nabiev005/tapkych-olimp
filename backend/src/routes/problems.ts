import { Router } from 'express';
import * as problems from '../controllers/problems.js';
import { optionalAuth } from '../middleware/auth.js';
import { createSubmitLimiter } from '../middleware/rateLimit.js';
import { requirePermission } from '../middleware/requireRole.js';

export function createProblemsRouter(): Router {
  const router = Router();
  const submitLimiter = createSubmitLimiter();

  router.get('/', optionalAuth, problems.listProblems);
  router.get('/:slug', optionalAuth, problems.getProblem);
  router.post(
    '/:slug/submit',
    requirePermission('problems:submit'),
    submitLimiter,
    problems.submit,
  );
  router.post('/:slug/hint', requirePermission('problems:hint'), problems.openHint);
  router.post('/:slug/solution', requirePermission('problems:solution'), problems.openSolution);

  return router;
}
