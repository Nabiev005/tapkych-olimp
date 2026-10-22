import type { Request, Response } from 'express';
import { currentUser } from '../middleware/auth.js';
import * as userService from '../services/user.js';
import { sendData } from '../utils/response.js';
import { updateMeSchema } from '../validators/auth.js';

export async function getMe(req: Request, res: Response): Promise<void> {
  sendData(res, await userService.getMe(currentUser(req).id));
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const input = updateMeSchema.parse(req.body);
  sendData(res, await userService.updateMe(currentUser(req).id, input));
}
