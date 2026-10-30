import type { Request, Response } from 'express';
import { currentUser } from '../middleware/auth.js';
import * as assignmentService from '../services/assignments.js';
import * as classService from '../services/classes.js';
import * as proposalService from '../services/proposals.js';
import { sendData } from '../utils/response.js';
import {
  assignmentParamSchema,
  createAssignmentSchema,
  createClassSchema,
  idParamSchema,
  joinClassSchema,
  memberParamSchema,
} from '../validators/classes.js';
import { problemInputSchema } from '../validators/problemInput.js';

export async function listClasses(req: Request, res: Response): Promise<void> {
  sendData(res, await classService.listClasses(currentUser(req).id));
}

export async function createClass(req: Request, res: Response): Promise<void> {
  const input = createClassSchema.parse(req.body);
  sendData(res, await classService.createClass(currentUser(req).id, input), 201);
}

export async function joinClass(req: Request, res: Response): Promise<void> {
  const { code } = joinClassSchema.parse(req.body);
  sendData(res, await classService.joinClass(currentUser(req).id, code));
}

export async function getClass(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  sendData(res, await classService.getClass(id, currentUser(req)));
}

export async function getClassStats(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  sendData(res, await classService.getClassStats(id, currentUser(req)));
}

export async function removeMember(req: Request, res: Response): Promise<void> {
  const { id, userId } = memberParamSchema.parse(req.params);
  const viewer = currentUser(req);
  await classService.removeMember(id, userId === 'me' ? viewer.id : userId, viewer);
  sendData(res, { ok: true });
}

export async function createAssignment(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const input = createAssignmentSchema.parse(req.body);
  sendData(res, await assignmentService.createAssignment(id, currentUser(req), input), 201);
}

export async function getAssignment(req: Request, res: Response): Promise<void> {
  const { id, assignmentId } = assignmentParamSchema.parse(req.params);
  sendData(res, await assignmentService.getAssignment(id, assignmentId, currentUser(req)));
}

export async function getAssignmentSheet(req: Request, res: Response): Promise<void> {
  const { id, assignmentId } = assignmentParamSchema.parse(req.params);
  sendData(res, await assignmentService.getAssignmentSheet(id, assignmentId, currentUser(req)));
}

export async function createProposal(req: Request, res: Response): Promise<void> {
  const input = problemInputSchema.parse(req.body);
  sendData(res, await proposalService.createProposal(currentUser(req).id, input), 201);
}

export async function listMyProposals(req: Request, res: Response): Promise<void> {
  sendData(res, await proposalService.listMyProposals(currentUser(req).id));
}
