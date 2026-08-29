import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "@orderflow/contracts";
import { ForbiddenError, UnauthorizedError } from "../../../shared/errors/app-error.js";

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      next(new ForbiddenError());
      return;
    }

    next();
  };
}
