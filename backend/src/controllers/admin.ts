import type { Request, Response } from 'express';
import { currentUser } from '../middleware/auth.js';
import * as admin from '../services/admin.js';
import * as adminProblems from '../services/adminProblems.js';
import { checkAnswer } from '../services/answerChecker.js';
import { sendData } from '../utils/response.js';
import {
  adminProblemListSchema,
  adminUserListSchema,
  adminUserUpdateSchema,
  checkAnswerSchema,
  dailySetSchema,
  importSchema,
  problemMetaSchema,
  problemStatusSchema,
  schoolSchema,
  subjectSchema,
  topicSchema,
} from '../validators/admin.js';
import { idParamSchema } from '../validators/classes.js';
import { problemInputSchema } from '../validators/problemInput.js';

export async function stats(_req: Request, res: Response): Promise<void> {
  sendData(res, await admin.getStats());
}

export async function listProblems(req: Request, res: Response): Promise<void> {
  sendData(res, await adminProblems.listProblems(adminProblemListSchema.parse(req.query)));
}

export async function getProblem(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  sendData(res, await adminProblems.getProblem(id));
}

export async function createProblem(req: Request, res: Response): Promise<void> {
  const input = problemInputSchema.parse(req.body);
  const meta = problemMetaSchema.parse(req.body);
  sendData(res, await adminProblems.createProblem(currentUser(req).id, input, meta), 201);
}

export async function updateProblem(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const input = problemInputSchema.parse(req.body);
  const meta = problemMetaSchema.parse(req.body);
  sendData(res, await adminProblems.updateProblem(id, input, meta));
}

export async function setProblemStatus(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const { status, reviewNote } = problemStatusSchema.parse(req.body);
  sendData(res, await adminProblems.setStatus(id, status, reviewNote));
}

/** Editor helper: does this answer pass the checker for the given settings? */
export async function testAnswer(req: Request, res: Response): Promise<void> {
  const body = checkAnswerSchema.parse(req.body);
  sendData(res, {
    isCorrect: checkAnswer(
      {
        answerType: body.answerType,
        correctAnswer: body.correctAnswer,
        tolerance: body.tolerance ?? null,
      },
      body.answer,
    ),
  });
}

export async function importProblems(req: Request, res: Response): Promise<void> {
  const { problems, dryRun } = importSchema.parse(req.body);
  sendData(
    res,
    await adminProblems.importProblems(currentUser(req).id, problems, dryRun, req.lang),
  );
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  sendData(res, await admin.listUsers(adminUserListSchema.parse(req.query)));
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const input = adminUserUpdateSchema.parse(req.body);
  sendData(res, await admin.updateUser(currentUser(req).id, id, input));
}

export async function taxonomy(_req: Request, res: Response): Promise<void> {
  sendData(res, await admin.listTaxonomy());
}

export async function createSubject(req: Request, res: Response): Promise<void> {
  sendData(res, await admin.createSubject(subjectSchema.parse(req.body)), 201);
}

export async function updateSubject(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  sendData(res, await admin.updateSubject(id, subjectSchema.parse(req.body)));
}

export async function createTopic(req: Request, res: Response): Promise<void> {
  sendData(res, await admin.createTopic(topicSchema.parse(req.body)), 201);
}

export async function updateTopic(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const { subjectSlug: _subject, ...data } = topicSchema.parse(req.body);
  sendData(res, await admin.updateTopic(id, data));
}

export async function createSchool(req: Request, res: Response): Promise<void> {
  sendData(res, await admin.createSchool(schoolSchema.parse(req.body)), 201);
}

export async function updateSchool(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  sendData(res, await admin.updateSchool(id, schoolSchema.parse(req.body)));
}

export async function listDaily(_req: Request, res: Response): Promise<void> {
  sendData(res, await admin.listDaily());
}

export async function setDaily(req: Request, res: Response): Promise<void> {
  const { date, problemSlug } = dailySetSchema.parse(req.body);
  sendData(res, await admin.setDaily(date, problemSlug));
}
