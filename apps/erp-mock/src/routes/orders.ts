import { Router, type Request, type Response, type NextFunction } from "express";
import { erpOrderPayloadSchema } from "@orderflow/contracts";
import {
  createOrderWithIdempotency,
  findOrderById,
  listOrders,
  toPublicOrder,
} from "../repositories/order-repository.js";

export const ordersRouter = Router();

ordersRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idempotencyKey = req.headers["idempotency-key"];
    if (!idempotencyKey || typeof idempotencyKey !== "string" || idempotencyKey.trim() === "") {
      res.status(400).json({
        error: "Missing or invalid Idempotency-Key header",
        correlationId: req.correlationId,
      });
      return;
    }

    const parsed = erpOrderPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid order payload",
        details: parsed.error.flatten(),
        correlationId: req.correlationId,
      });
      return;
    }

    const result = await createOrderWithIdempotency(idempotencyKey, parsed.data, req.correlationId);

    res.status(result.responseStatus).json(result.responseBody);
  } catch (error) {
    next(error);
  }
});

ordersRouter.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await listOrders();
    res.json({
      data: orders.map(toPublicOrder),
      total: orders.length,
    });
  } catch (error) {
    next(error);
  }
});

ordersRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      res.status(400).json({
        error: "Invalid order id",
        correlationId: req.correlationId,
      });
      return;
    }

    const order = await findOrderById(id);
    if (!order) {
      res.status(404).json({
        error: "Order not found",
        correlationId: req.correlationId,
      });
      return;
    }

    res.json(toPublicOrder(order));
  } catch (error) {
    next(error);
  }
});
