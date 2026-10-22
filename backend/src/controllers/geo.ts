import type { Request, Response } from 'express';
import * as geoService from '../services/geo.js';
import { sendData } from '../utils/response.js';
import { schoolSearchSchema } from '../validators/geo.js';

export async function listRegions(_req: Request, res: Response): Promise<void> {
  sendData(res, await geoService.listRegions());
}

export async function searchSchools(req: Request, res: Response): Promise<void> {
  sendData(res, await geoService.searchSchools(schoolSearchSchema.parse(req.query)));
}
