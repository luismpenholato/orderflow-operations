import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../../../shared/errors/app-error.js";
import { verifyToken, AUTH_COOKIE_NAME } from "../domain/jwt.js";

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;

  if (!token) {
    next(new UnauthorizedError());
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired session"));
  }
}

export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
  if (token) {
    try {
      const payload = verifyToken(token);
      req.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      };
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}
