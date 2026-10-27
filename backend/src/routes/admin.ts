import { Router } from 'express';
import * as admin from '../controllers/admin.js';
import { requirePermission } from '../middleware/requireRole.js';

// Everything under /api/admin. Each route checks its own permission.
export function createAdminRouter(): Router {
  const router = Router();

  router.get('/stats', requirePermission('admin:stats'), admin.stats);

  router.get('/problems', requirePermission('problems:update'), admin.listProblems);
  router.post('/problems', requirePermission('problems:create'), admin.createProblem);
  router.post('/problems/check-answer', requirePermission('problems:update'), admin.testAnswer);
  router.post('/problems/import', requirePermission('problems:import'), admin.importProblems);
  router.get('/problems/:id', requirePermission('problems:update'), admin.getProblem);
  router.put('/problems/:id', requirePermission('problems:update'), admin.updateProblem);
  router.post(
    '/problems/:id/status',
    requirePermission('problems:publish', 'problems:review'),
    admin.setProblemStatus,
  );

  router.get('/users', requirePermission('users:manage'), admin.listUsers);
  router.patch('/users/:id', requirePermission('users:manage'), admin.updateUser);

  router.get('/taxonomy', requirePermission('taxonomy:manage'), admin.taxonomy);
  router.post('/subjects', requirePermission('taxonomy:manage'), admin.createSubject);
  router.put('/subjects/:id', requirePermission('taxonomy:manage'), admin.updateSubject);
  router.post('/topics', requirePermission('taxonomy:manage'), admin.createTopic);
  router.put('/topics/:id', requirePermission('taxonomy:manage'), admin.updateTopic);
  router.post('/schools', requirePermission('schools:manage'), admin.createSchool);
  router.put('/schools/:id', requirePermission('schools:manage'), admin.updateSchool);

  router.get('/daily', requirePermission('daily:manage'), admin.listDaily);
  router.put('/daily', requirePermission('daily:manage'), admin.setDaily);

  return router;
}
