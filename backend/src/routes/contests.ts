import { Router } from 'express';
import * as contests from '../controllers/contests.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { createContestSubmitLimiter } from '../middleware/rateLimit.js';
import { requirePermission } from '../middleware/requireRole.js';

// Creating: admins (public) or class teachers — checked in the service.
export function createContestsRouter(): Router {
  const router = Router();
  const submitLimiter = createContestSubmitLimiter();
  const participate = requirePermission('contests:participate');

  router.get('/', optionalAuth, contests.list);
  router.post('/', requireAuth, contests.create);
  router.get('/:id', optionalAuth, contests.get);
  router.get('/:id/results', optionalAuth, contests.results);
  router.post('/:id/register', participate, contests.register);
  router.post('/:id/start', participate, contests.start);
  router.post('/:id/submit', participate, submitLimiter, contests.submit);
  router.post('/:id/finish', participate, contests.finish);

  return router;
}
