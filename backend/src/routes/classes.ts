import { Router } from 'express';
import * as classes from '../controllers/classes.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/requireRole.js';

// Ownership (own class / own membership) is checked in the services.
export function createClassesRouter(): Router {
  const router = Router();

  router.get('/', requireAuth, classes.listClasses);
  router.post('/', requirePermission('classes:create'), classes.createClass);
  router.post('/join', requirePermission('classes:join'), classes.joinClass);
  router.get('/:id', requireAuth, classes.getClass);
  router.get('/:id/stats', requirePermission('classes:stats'), classes.getClassStats);
  router.delete('/:id/members/:userId', requireAuth, classes.removeMember);
  router.post(
    '/:id/assignments',
    requirePermission('assignments:create'),
    classes.createAssignment,
  );
  router.get('/:id/assignments/:assignmentId', requireAuth, classes.getAssignment);

  return router;
}
