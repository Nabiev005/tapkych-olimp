import type { Request, Response } from 'express';
import { currentUser } from '../middleware/auth.js';
import * as contestService from '../services/contests.js';
import { sendData } from '../utils/response.js';
import { idParamSchema } from '../validators/classes.js';
import { contestSubmitSchema, createContestSchema } from '../validators/contests.js';

export async function list(req: Request, res: Response): Promise<void> {
  sendData(res, await contestService.listContests(req.user));
}

export async function get(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  sendData(res, await contestService.getContest(id, req.user));
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = createContestSchema.parse(req.body);
  sendData(res, await contestService.createContest(currentUser(req), input), 201);
}

export async function register(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  sendData(res, await contestService.register(id, currentUser(req)));
}

export async function start(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  sendData(res, await contestService.start(id, currentUser(req)));
}

export async function submit(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const { problemId, answer } = contestSubmitSchema.parse(req.body);
  sendData(res, await contestService.submit(id, currentUser(req), problemId, answer));
}

export async function finish(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  sendData(res, await contestService.finish(id, currentUser(req)));
}

export async function results(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  sendData(res, await contestService.results(id, req.user));
}
