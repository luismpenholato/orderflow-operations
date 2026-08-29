import express, { type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { checkDatabaseConnection } from "./database/pool.js";
import { ordersRouter } from "./routes/orders.js";

type LogLevel = "debug" | "info" | "warn" | "error";

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: "erp-mock",
    message,
    ...(meta ?? {}),
  };

  const output = JSON.stringify(entry);
  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
};

function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = (req.headers["x-correlation-id"] as string | undefined) ?? randomUUID();
  req.correlationId = correlationId;
  res.setHeader("X-Correlation-Id", correlationId);
  next();
}

function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    logger.info("HTTP request", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
    });
  });

  next();
}

function failureSimulationMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (config.failureRate <= 0) {
    next();
    return;
  }

  if (Math.random() < config.failureRate) {
    logger.warn("Simulated ERP failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      failureRate: config.failureRate,
    });

    res.status(503).json({
      error: "ERP temporarily unavailable",
      correlationId: req.correlationId,
    });
    return;
  }

  next();
}

function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  logger.error("Unhandled error", {
    correlationId: req.correlationId,
    error: err instanceof Error ? err.message : "Unknown error",
    stack: err instanceof Error ? err.stack : undefined,
  });

  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    error: "Internal server error",
    correlationId: req.correlationId,
  });
}

export function createApp(): express.Application {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(correlationMiddleware);
  app.use(requestLoggingMiddleware);

  app.get("/health", async (_req, res) => {
    const dbHealthy = await checkDatabaseConnection();
    const status = dbHealthy ? "healthy" : "degraded";
    const statusCode = dbHealthy ? 200 : 503;

    res.status(statusCode).json({
      status,
      service: "erp-mock",
      database: dbHealthy ? "connected" : "disconnected",
      failureRate: config.failureRate,
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/orders", failureSimulationMiddleware, ordersRouter);
  app.use(errorHandler);

  return app;
}
