import type { Request, Response } from 'express';
import { currentUser } from '../middleware/auth.js';
import { getDashboard } from '../services/dashboard.js';
import { getDailyProblem } from '../services/daily.js';
import { getPublicProfile } from '../services/profile.js';
import { getLeaderboard, getSchoolLeaderboard } from '../services/rating.js';
import { sendData } from '../utils/response.js';
import {
  leaderboardQuerySchema,
  schoolLeaderboardQuerySchema,
  userIdParamSchema,
} from '../validators/rating.js';

export async function leaderboard(req: Request, res: Response): Promise<void> {
  const query = leaderboardQuerySchema.parse(req.query);
  sendData(res, await getLeaderboard(query, req.user?.id));
}

export async function schoolLeaderboard(req: Request, res: Response): Promise<void> {
  sendData(res, await getSchoolLeaderboard(schoolLeaderboardQuerySchema.parse(req.query)));
}

export async function publicProfile(req: Request, res: Response): Promise<void> {
  const { id } = userIdParamSchema.parse(req.params);
  sendData(res, await getPublicProfile(id, req.user?.id));
}

export async function daily(req: Request, res: Response): Promise<void> {
  sendData(res, await getDailyProblem(req.user?.id));
}

export async function dashboard(req: Request, res: Response): Promise<void> {
  sendData(res, await getDashboard(currentUser(req).id));
}
