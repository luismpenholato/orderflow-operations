import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import { errorHandler } from "./shared/errors/error-handler.js";
import {
  correlationMiddleware,
  requestLoggingMiddleware,
} from "./shared/observability/middleware.js";
import { checkDatabaseConnection } from "./shared/database/pool.js";
import { createAuthRoutes } from "./modules/auth/http/auth.routes.js";
import { createCustomerRoutes } from "./modules/customers/http/customer.routes.js";
import { createProductRoutes } from "./modules/products/http/product.routes.js";
import { createInventoryRoutes } from "./modules/inventory/http/inventory.routes.js";
import { createOrderRoutes } from "./modules/orders/http/order.routes.js";
import { createIntegrationRoutes } from "./modules/integrations/http/integration.routes.js";
import { createDashboardRoutes } from "./modules/dashboard/http/dashboard.routes.js";

export function createApp(): express.Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(correlationMiddleware);
  app.use(requestLoggingMiddleware);

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/ready", async (_req, res) => {
    const database = await checkDatabaseConnection();
    const status = database ? "ready" : "not_ready";

    res.status(database ? 200 : 503).json({
      status,
      checks: { database },
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/auth", createAuthRoutes());
  app.use("/api/customers", createCustomerRoutes());
  app.use("/api/products", createProductRoutes());
  app.use("/api/inventory", createInventoryRoutes());
  app.use("/api/orders", createOrderRoutes());
  app.use("/api/integrations", createIntegrationRoutes());
  app.use("/api/dashboard", createDashboardRoutes());

  app.use(errorHandler);

  return app;
}
