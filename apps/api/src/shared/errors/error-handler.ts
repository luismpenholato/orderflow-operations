import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "./app-error.js";
import { logger } from "../logging/logger.js";

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const correlationId = req.correlationId ?? "unknown";

  if (err instanceof AppError) {
    logger.warn("Business error", {
      correlationId,
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
    });
    res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      correlationId,
    });
    return;
  }

  if (err instanceof ZodError) {
    const message = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    res.status(400).json({
      code: "VALIDATION_ERROR",
      message,
      correlationId,
    });
    return;
  }

  logger.error("Unhandled error", {
    correlationId,
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred.",
    correlationId,
  });
}
