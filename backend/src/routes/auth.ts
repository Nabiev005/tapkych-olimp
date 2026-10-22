import { Router } from 'express';
import * as auth from '../controllers/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { createAuthLimiter } from '../middleware/rateLimit.js';

export function createAuthRouter(): Router {
  const router = Router();
  const authLimiter = createAuthLimiter();

  router.post('/register', authLimiter, auth.register);
  router.post('/login', authLimiter, auth.login);
  router.post('/forgot-password', authLimiter, auth.forgotPassword);
  router.post('/reset-password', authLimiter, auth.resetPassword);
  router.post('/change-password', authLimiter, requireAuth, auth.changePassword);
  router.post('/refresh', auth.refresh);
  router.post('/logout', auth.logout);

  return router;
}
