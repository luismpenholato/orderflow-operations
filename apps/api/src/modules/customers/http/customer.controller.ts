import type { Request, Response } from "express";
import { z } from "zod";
import {
  createCustomerSchema,
  customerListQuerySchema,
  updateCustomerSchema,
} from "@orderflow/contracts";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../../shared/validation/validate.js";
import { ListCustomersUseCase } from "../application/list-customers.use-case.js";
import { GetCustomerUseCase } from "../application/get-customer.use-case.js";
import { CreateCustomerUseCase } from "../application/create-customer.use-case.js";
import { UpdateCustomerUseCase } from "../application/update-customer.use-case.js";

const idParamsSchema = z.object({ id: z.string().uuid() });

const listUseCase = new ListCustomersUseCase();
const getUseCase = new GetCustomerUseCase();
const createUseCase = new CreateCustomerUseCase();
const updateUseCase = new UpdateCustomerUseCase();

export const customerController = {
  async list(req: Request, res: Response): Promise<void> {
    const query = validateQuery(customerListQuerySchema)(req);
    const result = await listUseCase.execute(query);
    res.json(result);
  },

  async get(req: Request, res: Response): Promise<void> {
    const { id } = validateParams(idParamsSchema)(req);
    const customer = await getUseCase.execute(id);
    res.json(customer);
  },

  async create(req: Request, res: Response): Promise<void> {
    const input = validateBody(createCustomerSchema)(req);
    const customer = await createUseCase.execute(input);
    res.status(201).json(customer);
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = validateParams(idParamsSchema)(req);
    const input = validateBody(updateCustomerSchema)(req);
    const customer = await updateUseCase.execute(id, input);
    res.json(customer);
  },
};
