import type { Request, Response } from 'express';
import * as lessonService from '../services/lessons.js';
import { sendData } from '../utils/response.js';
import { slugParamSchema } from '../validators/problems.js';

export async function listLessons(_req: Request, res: Response): Promise<void> {
  sendData(res, await lessonService.listLessons());
}

export async function getLesson(req: Request, res: Response): Promise<void> {
  const { slug } = slugParamSchema.parse(req.params);
  sendData(res, await lessonService.getLesson(slug));
}
