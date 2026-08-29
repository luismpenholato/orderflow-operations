import type { Request, Response } from "express";
import { z } from "zod";
import { outboxListQuerySchema, syncAttemptListQuerySchema } from "@orderflow/contracts";
import { validateParams, validateQuery } from "../../../shared/validation/validate.js";
import { ListOutboxUseCase } from "../application/list-outbox.use-case.js";
import { ListSyncAttemptsUseCase } from "../application/list-sync-attempts.use-case.js";
import { RetryOutboxUseCase } from "../application/retry-outbox.use-case.js";

const idParamsSchema = z.object({ id: z.string().uuid() });

const listOutboxUseCase = new ListOutboxUseCase();
const listAttemptsUseCase = new ListSyncAttemptsUseCase();
const retryUseCase = new RetryOutboxUseCase();

export const integrationController = {
  async listOutbox(req: Request, res: Response): Promise<void> {
    const query = validateQuery(outboxListQuerySchema)(req);
    const result = await listOutboxUseCase.execute(query);
    res.json(result);
  },

  async listAttempts(req: Request, res: Response): Promise<void> {
    const query = validateQuery(syncAttemptListQuerySchema)(req);
    const result = await listAttemptsUseCase.execute(query);
    res.json(result);
  },

  async retryOutbox(req: Request, res: Response): Promise<void> {
    const { id } = validateParams(idParamsSchema)(req);
    const message = await retryUseCase.execute(id);
    res.json(message);
  },
};
