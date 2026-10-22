import type { Request, Response } from 'express';
import { currentUser } from '../middleware/auth.js';
import * as problemService from '../services/problems.js';
import { submitAnswer } from '../services/submissions.js';
import { sendData } from '../utils/response.js';
import { problemListQuerySchema, slugParamSchema, submitSchema } from '../validators/problems.js';

export async function listSubjects(_req: Request, res: Response): Promise<void> {
  sendData(res, await problemService.listSubjects());
}

export async function listTopics(req: Request, res: Response): Promise<void> {
  const { slug } = slugParamSchema.parse(req.params);
  sendData(res, await problemService.listTopics(slug));
}

export async function listProblems(req: Request, res: Response): Promise<void> {
  const query = problemListQuerySchema.parse(req.query);
  sendData(res, await problemService.listProblems(query, req.user?.id));
}

export async function getProblem(req: Request, res: Response): Promise<void> {
  const { slug } = slugParamSchema.parse(req.params);
  sendData(res, await problemService.getProblem(slug, req.user?.id));
}

export async function submit(req: Request, res: Response): Promise<void> {
  const { slug } = slugParamSchema.parse(req.params);
  const { answer } = submitSchema.parse(req.body);
  sendData(res, await submitAnswer(slug, currentUser(req).id, answer));
}

export async function openHint(req: Request, res: Response): Promise<void> {
  const { slug } = slugParamSchema.parse(req.params);
  sendData(res, await problemService.openHint(slug, currentUser(req).id));
}

export async function openSolution(req: Request, res: Response): Promise<void> {
  const { slug } = slugParamSchema.parse(req.params);
  sendData(res, await problemService.openSolution(slug, currentUser(req).id));
}
