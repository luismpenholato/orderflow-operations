import { createServer } from "node:http";
import { config } from "./config.js";
import { createApp } from "./app.js";
import { logger } from "./shared/logging/logger.js";
import { closePool } from "./shared/database/pool.js";
import { startOutboxWorker, stopOutboxWorker } from "./workers/outbox-worker.js";

const app = createApp();
const server = createServer(app);

startOutboxWorker();

server.listen(config.port, () => {
  logger.info("API server started", {
    port: config.port,
    nodeEnv: config.nodeEnv,
  });
});

function shutdown(signal: string): void {
  logger.info("Shutdown signal received", { signal });

  stopOutboxWorker();

  server.close(async () => {
    logger.info("HTTP server closed");
    try {
      await closePool();
      logger.info("Database pool closed");
      process.exit(0);
    } catch (error) {
      logger.error("Error during shutdown", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
