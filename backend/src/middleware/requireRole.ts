import type { NextFunction, Request, Response } from 'express';
import { hasPermission, type Permission } from '../config/permissions.js';
import { AppError } from '../utils/errors.js';
import { requireAuth } from './auth.js';

/** Authenticates and checks a permission: requirePermission('problems:create'). */
export function requirePermission(...permissions: Permission[]) {
  return [
    requireAuth,
    (req: Request, _res: Response, next: NextFunction): void => {
      const role = req.user?.role;
      if (!role || !permissions.every((p) => hasPermission(role, p))) throw AppError.forbidden();
      next();
    },
  ];
}
