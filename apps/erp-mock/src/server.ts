import { createApp, logger } from "./app.js";
import { config } from "./config.js";
import { closePool } from "./database/pool.js";

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info("ERP mock service started", {
    port: config.port,
    nodeEnv: config.nodeEnv,
    failureRate: config.failureRate,
  });
});

async function shutdown(signal: string): Promise<void> {
  logger.info("Shutting down ERP mock service", { signal });

  server.close(async () => {
    await closePool();
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", {
    error: reason instanceof Error ? reason.message : String(reason),
  });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", {
    error: error.message,
    stack: error.stack,
  });
  void shutdown("uncaughtException");
});
