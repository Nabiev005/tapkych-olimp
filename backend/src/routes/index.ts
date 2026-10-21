import { Router } from 'express';
import { sendData } from '../utils/response.js';

// All API routes are mounted under /api in app.ts.
export const apiRouter = Router();

apiRouter.get('/health', (req, res) => {
  sendData(res, { status: 'ok', lang: req.lang, time: new Date().toISOString() });
});
