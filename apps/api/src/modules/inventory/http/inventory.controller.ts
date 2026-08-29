import type { Request, Response } from "express";
import { z } from "zod";
import { inventoryAdjustmentSchema, inventoryListQuerySchema } from "@orderflow/contracts";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../../shared/validation/validate.js";
import { ListInventoryUseCase } from "../application/list-inventory.use-case.js";
import { GetInventoryUseCase } from "../application/get-inventory.use-case.js";
import { AdjustInventoryUseCaseWrapper } from "../application/adjust-inventory.use-case.js";
import { UnauthorizedError } from "../../../shared/errors/app-error.js";

const productIdParamsSchema = z.object({ productId: z.string().uuid() });

const listUseCase = new ListInventoryUseCase();
const getUseCase = new GetInventoryUseCase();
const adjustUseCase = new AdjustInventoryUseCaseWrapper();

export const inventoryController = {
  async list(req: Request, res: Response): Promise<void> {
    const query = validateQuery(inventoryListQuerySchema)(req);
    const result = await listUseCase.execute(query);
    res.json(result);
  },

  async get(req: Request, res: Response): Promise<void> {
    const { productId } = validateParams(productIdParamsSchema)(req);
    const balance = await getUseCase.execute(productId);
    res.json(balance);
  },

  async adjust(req: Request, res: Response): Promise<void> {
    const { productId } = validateParams(productIdParamsSchema)(req);
    const input = validateBody(inventoryAdjustmentSchema)(req);

    if (!req.user?.id) {
      throw new UnauthorizedError();
    }

    const balance = await adjustUseCase.execute(productId, input, req.user.id, req.correlationId);
    res.json(balance);
  },
};
