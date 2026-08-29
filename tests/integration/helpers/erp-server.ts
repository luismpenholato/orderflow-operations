import type { Server } from "node:http";
import express from "express";
import { erpOrderPayloadSchema } from "@orderflow/contracts";
import {
  createOrderWithIdempotency,
  listOrders,
} from "../../../apps/erp-mock/src/repositories/order-repository.js";

export interface ErpServerHandle {
  url: string;
  server: Server;
  setFailureCount: (count: number) => void;
  resetFailures: () => void;
}

export async function startErpServer(): Promise<ErpServerHandle> {
  let remainingFailures = 0;

  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.post("/api/orders", async (req, res, next) => {
    try {
      if (remainingFailures > 0) {
        remainingFailures -= 1;
        res.status(503).json({ error: "ERP temporarily unavailable" });
        return;
      }

      const idempotencyKey = req.headers["idempotency-key"];
      if (!idempotencyKey || typeof idempotencyKey !== "string") {
        res.status(400).json({ error: "Missing Idempotency-Key header" });
        return;
      }

      const parsed = erpOrderPayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid order payload" });
        return;
      }

      const correlationId =
        (req.headers["x-correlation-id"] as string | undefined) ?? "test-correlation";

      const result = await createOrderWithIdempotency(idempotencyKey, parsed.data, correlationId);

      res.status(result.responseStatus).json(result.responseBody);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/orders", async (_req, res, next) => {
    try {
      const orders = await listOrders();
      res.json({ data: orders, total: orders.length });
    } catch (error) {
      next(error);
    }
  });

  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    },
  );

  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to resolve ERP mock server address");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    server,
    setFailureCount: (count: number) => {
      remainingFailures = count;
    },
    resetFailures: () => {
      remainingFailures = 0;
    },
  };
}

export async function stopErpServer(handle: ErpServerHandle): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    handle.server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
