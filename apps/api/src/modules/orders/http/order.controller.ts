import type { Request, Response } from "express";
import { z } from "zod";
import { createOrderSchema, orderListQuerySchema } from "@orderflow/contracts";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../../shared/validation/validate.js";
import { UnauthorizedError } from "../../../shared/errors/app-error.js";
import { ListOrdersUseCase } from "../application/list-orders.use-case.js";
import { GetOrderUseCase } from "../application/get-order.use-case.js";
import { CreateOrderUseCase } from "../application/create-order.use-case.js";
import { CancelOrderUseCase } from "../application/cancel-order.use-case.js";

const idParamsSchema = z.object({ id: z.string().uuid() });
const idempotencyKeySchema = z.string().trim().min(1).max(255);

const listUseCase = new ListOrdersUseCase();
const getUseCase = new GetOrderUseCase();
const createUseCase = new CreateOrderUseCase();
const cancelUseCase = new CancelOrderUseCase();

export const orderController = {
  async list(req: Request, res: Response): Promise<void> {
    const query = validateQuery(orderListQuerySchema)(req);
    const result = await listUseCase.execute(query);
    res.json(result);
  },

  async get(req: Request, res: Response): Promise<void> {
    const { id } = validateParams(idParamsSchema)(req);
    const order = await getUseCase.execute(id);
    res.json(order);
  },

  async create(req: Request, res: Response): Promise<void> {
    if (!req.user?.id) {
      throw new UnauthorizedError();
    }

    const input = validateBody(createOrderSchema)(req);
    const idempotencyHeader = req.headers["idempotency-key"];
    const idempotencyKey = idempotencyHeader
      ? idempotencyKeySchema.parse(idempotencyHeader)
      : undefined;

    const order = await createUseCase.execute(
      input,
      req.user.id,
      req.correlationId,
      idempotencyKey,
    );
    res.status(201).json(order);
  },

  async cancel(req: Request, res: Response): Promise<void> {
    if (!req.user?.id) {
      throw new UnauthorizedError();
    }

    const { id } = validateParams(idParamsSchema)(req);
    const order = await cancelUseCase.execute(id, req.user.id, req.correlationId);
    res.json(order);
  },
};
